import type { CsvParser, ParseResult, ParsedBooking, ParseError } from "./base-parser";
import { parseCsvString, parseAmount } from "./base-parser";

/**
 * インスタベースCSVパーサー
 *
 * CSVカラム構成（18列）:
 * 1. 予約ID
 * 2. 施設名（掲載名）
 * 3. スペース名（プラン名・部屋判別用）
 * 4. ステータス
 * 5. 決済方法
 * 6. 決済状況
 * 7. 予約者ID
 * 8. 予約者会社名・屋号
 * 9. 予約者名
 * 10. 利用用途
 * 11. 用途詳細
 * 12. 利用人数
 * 13. 申込日時
 * 14. 利用開始日時
 * 15. 利用終了日時
 * 16. 利用時間 (時間)
 * 17. 予約金額 (税込)
 * 18. 支払金額 (税込)
 */
export const instabaseParser: CsvParser = {
  platformCode: "instabase",
  platformName: "インスタベース",

  validateHeaders(headers: string[]): boolean {
    const requiredHeaders = [
      "予約ID",
      "施設名",
      "スペース名",
      "ステータス",
      "利用開始日時",
      "利用終了日時",
      "予約金額 (税込)",
      "支払金額 (税込)",
    ];

    return requiredHeaders.every((h) =>
      headers.some((header) => header.includes(h.replace(" (税込)", "")) || header === h)
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
        errors: [{ row: 0, message: "CSVヘッダーがインスタベースの形式と一致しません" }],
        warnings: [],
      };
    }

    result.data.forEach((row, index) => {
      const rowNumber = index + 2; // ヘッダー行を考慮

      try {
        // 必須フィールドチェック
        const reservationId = row["予約ID"]?.trim();
        const facilityName = row["施設名"]?.trim();
        const spaceName = row["スペース名"]?.trim();
        const status = row["ステータス"]?.trim();

        if (!reservationId || !facilityName) {
          // 空行やデータ行でない場合はスキップ
          return;
        }

        // 日時パース
        const startDateTime = row["利用開始日時"]?.trim() || "";
        const endDateTime = row["利用終了日時"]?.trim() || "";
        const bookingDateTime = row["申込日時"]?.trim() || "";

        // 日時を日付と時刻に分離
        const { date: usageDate, time: startTime } = parseDateTimeJP(startDateTime);
        const { time: endTime } = parseDateTimeJP(endDateTime);
        const { date: bookingDate } = parseDateTimeJP(bookingDateTime);

        // 金額
        const grossAmount = parseAmount(row["予約金額 (税込)"] || row["予約金額（税込）"] || "0");
        const netAmount = parseAmount(row["支払金額 (税込)"] || row["支払金額（税込）"] || "0");

        // 利用時間（時間単位 → 分に変換）
        const durationHours = parseFloat(row["利用時間 (時間)"] || row["利用時間（時間）"] || "0");
        const durationMinutes = Math.round(durationHours * 60);

        // ステータス変換
        const bookingStatus = convertStatus(status);

        // キャンセルの場合は警告を追加
        if (bookingStatus === "cancelled" && grossAmount === 0) {
          warnings.push(`行${rowNumber}: キャンセル済み予約（${reservationId}）`);
        }

        // ゲスト名（会社名があれば追加）
        const guestName = buildGuestName(
          row["予約者名"]?.trim() || "",
          row["予約者会社名・屋号"]?.trim() || ""
        );

        // 利用用途・人数（分析用）
        const usagePurpose = row["利用用途"]?.trim() || undefined;
        const usageDetail = row["用途詳細"]?.trim() || undefined;
        const guestCountStr = row["利用人数"]?.trim() || "";
        const guestCount = guestCountStr ? parseInt(guestCountStr, 10) : undefined;

        // 部屋判別用のスペース名も含めてパース結果を返す
        bookings.push({
          platformPropertyName: facilityName,
          booking: {
            platformBookingId: reservationId,
            bookingDate: bookingDate || usageDate, // 申込日がない場合は利用日を使用
            usageDate,
            startTime,
            endTime,
            durationMinutes: durationMinutes || undefined,
            grossAmount,
            netAmount: netAmount || undefined,
            commission: grossAmount - netAmount || undefined,
            guestName: guestName || undefined,
            status: bookingStatus,
            usagePurpose,
            usageDetail,
            guestCount: guestCount && !isNaN(guestCount) ? guestCount : undefined,
            // 追加情報（後でroomId解決に使用）
            roomId: null,
          },
          // スペース名を追加データとして保持（部屋判別用）
          spaceName,
        } as ParsedBooking & { spaceName: string });
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
 * 日本語日時形式をパース
 * 例: "2026-01-09 12:58" → { date: "2026-01-09", time: "12:58" }
 */
function parseDateTimeJP(dateTimeStr: string): { date: string; time: string } {
  if (!dateTimeStr) {
    return { date: "", time: "" };
  }

  // "YYYY-MM-DD HH:MM" 形式
  const match = dateTimeStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/);
  if (match) {
    const [, date, time] = match;
    // 時刻を2桁にパディング
    const [hour, minute] = time.split(":");
    const paddedTime = `${hour.padStart(2, "0")}:${minute}`;
    return { date, time: paddedTime };
  }

  // "YYYY/MM/DD HH:MM" 形式
  const matchSlash = dateTimeStr.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{1,2}:\d{2})$/);
  if (matchSlash) {
    const [, year, month, day, time] = matchSlash;
    const [hour, minute] = time.split(":");
    const paddedTime = `${hour.padStart(2, "0")}:${minute}`;
    return { date: `${year}-${month}-${day}`, time: paddedTime };
  }

  // 日付のみの場合
  const dateOnlyMatch = dateTimeStr.match(/^(\d{4}[-/]\d{2}[-/]\d{2})$/);
  if (dateOnlyMatch) {
    return { date: dateOnlyMatch[1].replace(/\//g, "-"), time: "" };
  }

  return { date: dateTimeStr, time: "" };
}

/**
 * ステータスを内部形式に変換
 */
function convertStatus(status: string): string {
  if (!status) return "confirmed";

  if (status.includes("キャンセル")) {
    return "cancelled";
  }
  if (status.includes("確定") || status.includes("完了")) {
    return "confirmed";
  }
  if (status.includes("仮予約") || status.includes("保留")) {
    return "pending";
  }

  return "confirmed";
}

/**
 * ゲスト名を構築（会社名がある場合は追加）
 */
function buildGuestName(name: string, company: string): string {
  if (!name) return company || "";
  if (!company) return name;
  return `${name}（${company}）`;
}

export default instabaseParser;
