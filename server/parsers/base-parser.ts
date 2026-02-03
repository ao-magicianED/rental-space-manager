import Papa from "papaparse";
import type { NewBooking } from "../db/schema";

/**
 * CSVパーサーの基底インターフェース
 * 各プラットフォームはこのインターフェースを実装する
 */
export interface CsvParser {
  platformCode: string;
  platformName: string;

  /**
   * CSVデータをパースして予約データに変換
   */
  parse(csvContent: string): ParseResult;

  /**
   * CSVのヘッダーが期待するフォーマットかチェック
   */
  validateHeaders(headers: string[]): boolean;
}

export interface ParseResult {
  success: boolean;
  bookings: ParsedBooking[];
  errors: ParseError[];
  warnings: string[];
}

export interface ParsedBooking {
  // プラットフォーム上の施設名（マッピング用）
  platformPropertyName: string;
  // 予約データ
  booking: Omit<NewBooking, "propertyId" | "platformId">;
}

export interface ParseError {
  row: number;
  column?: string;
  message: string;
}

/**
 * CSV文字列をパースするユーティリティ
 */
export function parseCsvString(csvContent: string): Papa.ParseResult<Record<string, string>> {
  return Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
}

/**
 * 日付文字列を正規化（YYYY-MM-DD形式に変換）
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // 既にYYYY-MM-DD形式の場合
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // YYYY/MM/DD形式
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, "-");
  }

  // MM/DD/YYYY形式（アメリカ式）
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // 日本語形式（2024年1月15日）
  const jpMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jpMatch) {
    const [, year, month, day] = jpMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return dateStr;
}

/**
 * 時刻文字列を正規化（HH:MM形式に変換）
 */
export function normalizeTime(timeStr: string): string {
  if (!timeStr) return "";

  // 既にHH:MM形式の場合
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }

  // H:MM形式
  const shortMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (shortMatch) {
    const [, hour, minute] = shortMatch;
    return `${hour.padStart(2, "0")}:${minute}`;
  }

  return timeStr;
}

/**
 * 金額文字列をパース（カンマや円記号を除去）
 */
export function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[,、円¥\\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * 利用時間を分に変換
 */
export function parseDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;

  // 日をまたぐ場合（終了時刻が開始時刻より小さい）
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}
