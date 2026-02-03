import type { CsvParser, ParseResult, ParsedBooking, ParseError } from "./base-parser";
import {
  parseCsvString,
  normalizeDate,
  normalizeTime,
  parseAmount,
  parseDuration,
} from "./base-parser";

/**
 * 汎用CSVパーサー
 * サンプルCSVを受領するまでの仮実装
 * 一般的なカラム名を自動検出して対応
 */
export const genericParser: CsvParser = {
  platformCode: "generic",
  platformName: "汎用パーサー",

  validateHeaders(headers: string[]): boolean {
    // 必須カラム：施設名、利用日、金額のいずれかが存在すればOK
    const requiredPatterns = [
      /(施設|スペース|物件|店舗)/i,
      /(利用日|予約日|日付|date)/i,
      /(金額|売上|料金|amount|price)/i,
    ];

    return requiredPatterns.every((pattern) =>
      headers.some((h) => pattern.test(h))
    );
  },

  parse(csvContent: string): ParseResult {
    const result = parseCsvString(csvContent);

    if (result.errors.length > 0) {
      return {
        success: false,
        bookings: [],
        errors: result.errors.map((e, i) => ({
          row: e.row || i,
          message: e.message,
        })),
        warnings: [],
      };
    }

    const headers = result.meta.fields || [];
    const bookings: ParsedBooking[] = [];
    const errors: ParseError[] = [];
    const warnings: string[] = [];

    // カラム名の自動検出
    const columnMap = detectColumns(headers);

    if (!columnMap.propertyName) {
      return {
        success: false,
        bookings: [],
        errors: [{ row: 0, message: "施設名のカラムが見つかりません" }],
        warnings: [],
      };
    }

    result.data.forEach((row, index) => {
      try {
        const propertyName = row[columnMap.propertyName!] || "";
        const usageDate = normalizeDate(row[columnMap.usageDate!] || "");
        const bookingDate = normalizeDate(
          row[columnMap.bookingDate!] || usageDate
        );
        const startTime = normalizeTime(row[columnMap.startTime!] || "");
        const endTime = normalizeTime(row[columnMap.endTime!] || "");
        const grossAmount = parseAmount(row[columnMap.grossAmount!] || "0");
        const netAmount = parseAmount(
          row[columnMap.netAmount!] || row[columnMap.grossAmount!] || "0"
        );

        if (!propertyName || !usageDate) {
          errors.push({
            row: index + 2,
            message: "施設名または利用日が空です",
          });
          return;
        }

        const booking: ParsedBooking = {
          platformPropertyName: propertyName,
          booking: {
            bookingDate,
            usageDate,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            durationMinutes: parseDuration(startTime, endTime) || undefined,
            grossAmount,
            netAmount: netAmount || undefined,
            commission: grossAmount - netAmount || undefined,
            platformBookingId: row[columnMap.bookingId!] || undefined,
            guestName: row[columnMap.guestName!] || undefined,
            status: "confirmed",
          },
        };

        bookings.push(booking);
      } catch (e) {
        errors.push({
          row: index + 2,
          message: `パースエラー: ${e}`,
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

interface ColumnMap {
  propertyName?: string;
  usageDate?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  grossAmount?: string;
  netAmount?: string;
  bookingId?: string;
  guestName?: string;
}

function detectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};

  headers.forEach((header) => {
    const h = header.toLowerCase();

    // 施設名
    if (
      !map.propertyName &&
      (h.includes("施設") ||
        h.includes("スペース") ||
        h.includes("物件") ||
        h.includes("店舗") ||
        h.includes("room") ||
        h.includes("space"))
    ) {
      map.propertyName = header;
    }

    // 利用日
    if (
      !map.usageDate &&
      (h.includes("利用日") ||
        h.includes("使用日") ||
        h.includes("usage") ||
        h === "日付" ||
        h === "date")
    ) {
      map.usageDate = header;
    }

    // 予約日
    if (
      !map.bookingDate &&
      (h.includes("予約日") || h.includes("申込日") || h.includes("booking"))
    ) {
      map.bookingDate = header;
    }

    // 開始時刻
    if (
      !map.startTime &&
      (h.includes("開始") || h.includes("start") || h === "from")
    ) {
      map.startTime = header;
    }

    // 終了時刻
    if (
      !map.endTime &&
      (h.includes("終了") || h.includes("end") || h === "to")
    ) {
      map.endTime = header;
    }

    // 総額
    if (
      !map.grossAmount &&
      (h.includes("総額") ||
        h.includes("売上") ||
        h.includes("金額") ||
        h.includes("料金") ||
        h.includes("amount") ||
        h.includes("price") ||
        h.includes("total"))
    ) {
      map.grossAmount = header;
    }

    // 入金額
    if (
      !map.netAmount &&
      (h.includes("入金") ||
        h.includes("振込") ||
        h.includes("net") ||
        h.includes("payout"))
    ) {
      map.netAmount = header;
    }

    // 予約ID
    if (
      !map.bookingId &&
      (h.includes("予約id") ||
        h.includes("予約番号") ||
        h.includes("booking") ||
        h.includes("reservation"))
    ) {
      map.bookingId = header;
    }

    // ゲスト名
    if (
      !map.guestName &&
      (h.includes("名前") ||
        h.includes("氏名") ||
        h.includes("ゲスト") ||
        h.includes("guest") ||
        h.includes("name"))
    ) {
      map.guestName = header;
    }
  });

  return map;
}

export default genericParser;
