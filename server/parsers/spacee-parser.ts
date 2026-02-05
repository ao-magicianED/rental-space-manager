import type { CsvParser, ParseResult, ParsedBooking, ParseError } from "./base-parser";
import { parseCsvString } from "./base-parser";

/**
 * スペイシーCSVパーサー
 *
 * CSVカラム構成（19列）:
 *  1. 予約ID
 *  2. スペース名（長い掲載名。先頭に?が付く場合あり）
 *  3. 予約ステータス（予約完了 / 利用者キャンセル / 振込期限切れ / 掲載者キャンセル）
 *  4. お支払い方法
 *  5. 予約者名
 *  6. 利用目的
 *  7. 利用人数
 *  8. 予約申込日（YYYY/MM/DD）
 *  9. 予約確定日（YYYY/MM/DD）
 * 10. 利用開始日時（YYYY/MM/DD HH:MM:SS）
 * 11. 利用終了日時（YYYY/MM/DD HH:MM:SS）
 * 12. 利用時間（分）
 * 13. スペース利用料（税込）
 * 14. オプション設備（税込）
 * 15. キャンセル予約金額（税込）
 * 16. 差引合計売上金額（税込）→ grossAmount
 * 17. システム利用料（税抜。料率毎合計）
 * 18. システム利用料消費税（合計）
 * 19. 精算額（合計）→ netAmount
 */
export const spaceeParser: CsvParser = {
  platformCode: "spacee",
  platformName: "スペイシー",

  validateHeaders(headers: string[]): boolean {
    const requiredHeaders = ["予約ID", "スペース名", "予約ステータス", "利用開始日時"];
    return requiredHeaders.every((h) =>
      headers.some((header) => header.includes(h))
    );
  },

  parse(csvContent: string): ParseResult {
    const result = parseCsvString(csvContent);
    const bookings: ParsedBooking[] = [];
    const errors: ParseError[] = [];
    const warnings: string[] = [];

    if (result.errors.length > 0) {
      result.errors.forEach((err) => {
        errors.push({
          row: err.row ?? 0,
          message: err.message,
        });
      });
    }

    // ヘッダー検証
    if (result.meta.fields && !this.validateHeaders(result.meta.fields)) {
      return {
        success: false,
        bookings: [],
        errors: [{ row: 0, message: "CSVヘッダーがスペイシーの形式と一致しません" }],
        warnings: [],
      };
    }

    result.data.forEach((row, index) => {
      const rowNumber = index + 2;

      try {
        const reservationId = row["予約ID"]?.trim();
        const spaceName = row["スペース名"]?.trim() || "";

        if (!reservationId || !/^\d+$/.test(reservationId)) {
          return;
        }

        // 施設名を抽出
        const platformPropertyName = extractSpaceePropertyName(spaceName);

        // 日時パース
        const startDateTimeStr = row["利用開始日時"]?.trim() || "";
        const endDateTimeStr = row["利用終了日時"]?.trim() || "";
        const bookingDateStr = row["予約申込日"]?.trim() || "";

        const { date: usageDate, time: startTime } = parseSpaceeDateTime(startDateTimeStr);
        const { time: endTime } = parseSpaceeDateTime(endDateTimeStr);
        const bookingDate = normalizeSpaceeDate(bookingDateStr);

        if (!usageDate) {
          warnings.push(`行${rowNumber}: 利用開始日時が空のためスキップ（予約ID: ${reservationId}）`);
          return;
        }

        // 金額パース
        const grossAmount = parseSpaceeAmount(row["差引合計売上金額（税込）"] || "0");
        const systemFee = parseSpaceeAmount(row["システム利用料（税抜。料率毎合計）"] || "0");
        const systemFeeTax = parseSpaceeAmount(row["システム利用料消費税（合計）"] || "0");
        const commission = systemFee + systemFeeTax;
        const netAmount = parseSpaceeAmount(row["精算額（合計）"] || "0");

        // 利用時間
        const durationMinutes = parseInt(row["利用時間（分）"] || "0", 10) || undefined;

        // ステータス変換
        const rawStatus = row["予約ステータス"]?.trim() || "";
        const bookingStatus = convertSpaceeStatus(rawStatus);

        if (bookingStatus === "cancelled") {
          warnings.push(`行${rowNumber}: キャンセル/期限切れ予約（${reservationId}）`);
        }

        // ゲスト名
        const guestName = row["予約者名"]?.trim() || undefined;

        // 利用目的・人数
        const usagePurpose = row["利用目的"]?.trim() || undefined;
        const guestCountStr = row["利用人数"]?.trim() || "";
        const guestCount = guestCountStr ? parseInt(guestCountStr, 10) : undefined;

        bookings.push({
          platformPropertyName,
          booking: {
            platformBookingId: reservationId,
            bookingDate: bookingDate || usageDate,
            usageDate,
            startTime,
            endTime,
            durationMinutes,
            grossAmount,
            netAmount: netAmount || undefined,
            commission: commission || undefined,
            guestName,
            status: bookingStatus,
            usagePurpose,
            usageDetail: undefined,
            guestCount: guestCount && !isNaN(guestCount) ? guestCount : undefined,
            roomId: null,
          },
        });
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: `パースエラー: ${err instanceof Error ? err.message : "不明なエラー"}`,
        });
      }
    });

    return {
      success: errors.length === 0,
      bookings,
      errors,
      warnings,
    };
  },
};

/**
 * スペイシーの長いスペース名から施設名を抽出
 *
 * 例:
 * "?2月限定!【神田駅1分】ブルースペース神田 20名着席..." → "ブルースペース神田"
 * "ブルースペース上野御徒町♪最大20人..." → "ブルースペース上野御徒町"
 * "ブルースペース上野駅前4A最大20人..." → "ブルースペース上野駅前4A"
 * "?2月限定!【西新宿駅4分】..." → "ブルースペース西新宿403"
 * "?2月限定!【白金高輪駅7分】..." → "ブルースペース白金高輪"
 */
function extractSpaceePropertyName(spaceName: string): string {
  // ブルースペースXXXXを抽出（上野駅前4A、上野駅前4B、上野御徒町、神田 等）
  const blueSpaceMatch = spaceName.match(/ブルースペース(上野駅前4[AB]|上野御徒町|神田|白金高輪|西新宿\d*)/);
  if (blueSpaceMatch) {
    return `ブルースペース${blueSpaceMatch[1]}`;
  }

  // 西新宿を含む場合
  if (spaceName.includes("西新宿")) {
    return "ブルースペース西新宿403";
  }

  // 白金高輪を含む場合
  if (spaceName.includes("白金高輪")) {
    return "ブルースペース白金高輪";
  }

  // 上野駅前を含む場合（4A/4Bの判定ができない場合）
  if (spaceName.includes("上野駅前")) {
    if (spaceName.includes("4A")) return "ブルースペース上野駅前4A";
    if (spaceName.includes("4B")) return "ブルースペース上野駅前4B";
    return "ブルースペース上野駅前";
  }

  // 上野御徒町を含む場合
  if (spaceName.includes("上野御徒町")) {
    return "ブルースペース上野御徒町";
  }

  // 神田を含む場合
  if (spaceName.includes("神田")) {
    return "ブルースペース神田";
  }

  // それ以外はそのまま返す（unmappedとして処理される）
  return spaceName.substring(0, 80);
}

/**
 * スペイシー形式の日時をパース
 * "2019/10/01 05:00:00" → { date: "2019-10-01", time: "05:00" }
 */
function parseSpaceeDateTime(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) return { date: "", time: "" };

  const match = dateTimeStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return {
      date: `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
      time: `${hour.padStart(2, "0")}:${minute}`,
    };
  }

  return { date: dateTimeStr, time: "" };
}

/**
 * スペイシー形式の日付を正規化
 * "2019/10/01" → "2019-10-01"
 */
function normalizeSpaceeDate(dateStr: string): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dateStr;
}

/**
 * スペイシー形式の金額をパース（整数値、空文字列対応）
 */
function parseSpaceeAmount(amountStr: string): number {
  if (!amountStr || amountStr.trim() === "") return 0;
  const num = parseInt(amountStr.trim(), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * スペイシーのステータスを内部形式に変換
 */
function convertSpaceeStatus(status: string): string {
  if (!status) return "confirmed";
  if (status.includes("キャンセル")) return "cancelled";
  if (status.includes("期限切れ")) return "cancelled";
  if (status === "予約完了") return "confirmed";
  return "confirmed";
}

export default spaceeParser;
