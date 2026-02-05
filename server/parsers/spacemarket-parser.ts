import type { CsvParser, ParseResult, ParsedBooking, ParseError } from "./base-parser";
import Papa from "papaparse";

/**
 * スペースマーケットCSVパーサー
 *
 * CSVカラム構成（20列）:
 * 行1: リンク行（スキップ必要）
 * 行2: 実際のヘッダー
 *   1. 予約ID
 *   2. 予約リクエスト日
 *   3. 成約日
 *   4. 実施日（= 利用日）
 *   5. 振込予定日
 *   6. 成約金額（= 売上総額・税込）
 *   7. 振込予定金額（= ネット金額）
 *   8. シェア設定（= 手数料率。例: 30%）
 *   9. お支払い方法
 *  10. 施設名（掲載名・長い名前）
 *  11. スペース名（掲載名・長い名前）
 *  12. プラン名
 *  13. ゲスト名
 *  14. 利用目的
 *  15. 手数料（金額）
 *  16. 予約月（YYYYMM形式）
 *  17. 利用月（YYYYMM形式）
 *  18. ステータス（成約 / CL）
 *  19. スペース名（短い施設名 → マッピング用）
 *  20. （空列）
 */
export const spacemarketParser: CsvParser = {
  platformCode: "spacemarket",
  platformName: "スペースマーケット",

  validateHeaders(headers: string[]): boolean {
    const requiredHeaders = ["予約ID", "成約金額", "実施日", "ステータス"];
    return requiredHeaders.every((h) =>
      headers.some((header) => header.includes(h))
    );
  },

  parse(csvContent: string): ParseResult {
    const bookings: ParsedBooking[] = [];
    const errors: ParseError[] = [];
    const warnings: string[] = [];

    // スペースマーケットCSVは1行目がリンク行、2行目が実際のヘッダー
    // まず全行を取得して1行目をスキップ
    const lines = csvContent.split(/\r?\n/);

    // 1行目がヘッダー行かどうか判定
    const firstLine = lines[0] || "";
    let csvToParse: string;

    if (firstLine.startsWith("リンク") || firstLine.startsWith("予約ID") === false) {
      // 1行目がリンク行の場合、スキップして2行目以降をパース
      csvToParse = lines.slice(1).join("\n");
    } else {
      // 1行目が既にヘッダーの場合はそのままパース
      csvToParse = csvContent;
    }

    const result = Papa.parse<Record<string, string>>(csvToParse, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (result.errors.length > 0) {
      result.errors.forEach((err) => {
        if (err.type !== "FieldMismatch") {
          errors.push({
            row: err.row ?? 0,
            message: err.message,
          });
        }
      });
    }

    // ヘッダー検証
    if (result.meta.fields && !this.validateHeaders(result.meta.fields)) {
      return {
        success: false,
        bookings: [],
        errors: [{ row: 0, message: "CSVヘッダーがスペースマーケットの形式と一致しません" }],
        warnings: [],
      };
    }

    result.data.forEach((row, index) => {
      const rowNumber = index + 3; // リンク行 + ヘッダー行を考慮

      try {
        const reservationId = row["予約ID"]?.trim();

        if (!reservationId || !/^\d+$/.test(reservationId)) {
          // 予約IDが数値でない行はスキップ（合計行など）
          return;
        }

        // 施設名: 19列目の短い施設名を優先使用
        // PapaParseでは同名カラムが存在する場合、最後のものが使われる可能性がある
        // フォールバックで10列目の施設名も使う
        const fields = result.meta.fields || [];
        const shortPropertyName = getColumnByIndex(row, fields, 18); // 19列目（0-indexed: 18）
        const longPropertyName = row["施設名"]?.trim() || "";
        const platformPropertyName = shortPropertyName || extractShortName(longPropertyName);

        // 日付パース
        const bookingDate = normalizeSpacemarketDate(row["予約リクエスト日"]?.trim() || "");
        const usageDate = normalizeSpacemarketDate(row["実施日"]?.trim() || "");

        if (!usageDate) {
          warnings.push(`行${rowNumber}: 実施日が空のためスキップ（予約ID: ${reservationId}）`);
          return;
        }

        // 金額パース（¥記号とカンマを含む形式）
        const grossAmount = parseSpacemarketAmount(row["成約金額"]?.trim() || "0");
        const netAmount = parseSpacemarketAmount(row["振込予定金額"]?.trim() || "0");
        const commission = parseSpacemarketAmount(row["手数料"]?.trim() || "0");

        // ステータス変換
        const rawStatus = row["ステータス"]?.trim() || "";
        const bookingStatus = convertSpacemarketStatus(rawStatus);

        // キャンセルの場合は警告
        if (bookingStatus === "cancelled") {
          warnings.push(`行${rowNumber}: キャンセル済み予約（${reservationId}）`);
        }

        // ゲスト名
        const guestName = row["ゲスト名"]?.trim() || undefined;

        // 利用目的
        const usagePurpose = row["利用目的"]?.trim() || undefined;

        // スペース名（部屋判別用）
        const spaceName = getColumnByIndex(row, fields, 19) || // 20列目
          row["スペース名"]?.trim() || "";

        bookings.push({
          platformPropertyName,
          booking: {
            platformBookingId: reservationId,
            bookingDate: bookingDate || usageDate,
            usageDate,
            startTime: null,
            endTime: null,
            durationMinutes: undefined,
            grossAmount,
            netAmount: netAmount || undefined,
            commission: commission || undefined,
            guestName,
            status: bookingStatus,
            usagePurpose,
            usageDetail: undefined,
            guestCount: undefined,
            roomId: null,
          },
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
 * インデックスでカラム値を取得（同名カラムがある場合の対策）
 */
function getColumnByIndex(
  row: Record<string, string>,
  fields: string[],
  index: number
): string {
  if (index >= fields.length) return "";
  const fieldName = fields[index];
  return row[fieldName]?.trim() || "";
}

/**
 * 長い施設名から短い名前を抽出
 * 例: "※2019年10月OPEN※神田東口徒歩1分「ブルースペース神田」..." → "ブルースペース神田"
 */
function extractShortName(longName: string): string {
  // 「」内の名前を抽出
  const bracketMatch = longName.match(/「(.+?)」/);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // ブルースペースXXXを抽出
  const blueSpaceMatch = longName.match(/(ブルースペース[^\s/！!・【】※]+)/);
  if (blueSpaceMatch) {
    return blueSpaceMatch[1];
  }

  return longName;
}

/**
 * スペースマーケット形式の日付を正規化
 * "2019/10/3" → "2019-10-03"
 */
function normalizeSpacemarketDate(dateStr: string): string {
  if (!dateStr) return "";

  const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // 既にYYYY-MM-DD形式の場合
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return dateStr;
}

/**
 * スペースマーケット形式の金額をパース
 * "¥7,833" → 7833, "¥111" → 111
 */
function parseSpacemarketAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[¥,\s"]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * スペースマーケットのステータスを内部形式に変換
 */
function convertSpacemarketStatus(status: string): string {
  if (!status) return "confirmed";

  if (status === "CL" || status.includes("キャンセル")) {
    return "cancelled";
  }
  if (status === "成約" || status.includes("成約")) {
    return "confirmed";
  }

  return "confirmed";
}

export default spacemarketParser;
