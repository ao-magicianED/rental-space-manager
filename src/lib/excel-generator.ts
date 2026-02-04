import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { Booking, DashboardSummary, DailySales, Property, Platform } from "./api";

// 通貨フォーマット
const formatCurrency = (value: number): string => `¥${value.toLocaleString()}`;

// 日付フォーマット
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP");
};

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

// 売上サマリーレポートをExcel出力
export async function exportSalesSummaryToExcel(
  summary: DashboardSummary,
  dailySales: DailySales[],
  properties: Property[],
  platforms: Platform[],
  dateRange: { startDate: string; endDate: string },
  options: ExportOptions = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "レンタルスペース管理システム";
  workbook.created = new Date();

  // サマリーシート
  const summarySheet = workbook.addWorksheet("サマリー");

  // タイトル
  summarySheet.mergeCells("A1:D1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "売上サマリーレポート";
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: "center" };

  // 期間
  summarySheet.mergeCells("A2:D2");
  summarySheet.getCell("A2").value = `期間: ${formatDate(dateRange.startDate)} 〜 ${formatDate(dateRange.endDate)}`;
  summarySheet.getCell("A2").alignment = { horizontal: "center" };

  // 空行
  summarySheet.addRow([]);

  // サマリーデータ
  const summaryData = [
    ["総売上（税込）", formatCurrency(summary.totalGross)],
    ["総売上（税抜）", formatCurrency(summary.totalNet)],
    ["予約件数", `${summary.bookingCount}件`],
    ["経費合計", formatCurrency(summary.totalExpense)],
    ["粗利益", formatCurrency(summary.grossProfit)],
  ];

  summaryData.forEach((row, index) => {
    const rowNum = 4 + index;
    summarySheet.getCell(`A${rowNum}`).value = row[0];
    summarySheet.getCell(`A${rowNum}`).font = { bold: true };
    summarySheet.getCell(`B${rowNum}`).value = row[1];
  });

  // 列幅設定
  summarySheet.getColumn("A").width = 20;
  summarySheet.getColumn("B").width = 20;

  // 物件別売上シート
  const propertySheet = workbook.addWorksheet("物件別売上");

  propertySheet.addRow(["物件名", "売上", "予約件数"]);
  const propertyHeaderRow = propertySheet.getRow(1);
  propertyHeaderRow.font = { bold: true };
  propertyHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  summary.salesByProperty.forEach((item) => {
    const property = properties.find((p) => p.id === item.propertyId);
    propertySheet.addRow([
      property?.name || `物件ID: ${item.propertyId}`,
      item.totalGross,
      item.bookingCount,
    ]);
  });

  // 数値列のフォーマット
  propertySheet.getColumn("B").numFmt = "¥#,##0";
  propertySheet.getColumn("A").width = 30;
  propertySheet.getColumn("B").width = 15;
  propertySheet.getColumn("C").width = 12;

  // プラットフォーム別売上シート
  const platformSheet = workbook.addWorksheet("プラットフォーム別売上");

  platformSheet.addRow(["プラットフォーム", "売上", "予約件数"]);
  const platformHeaderRow = platformSheet.getRow(1);
  platformHeaderRow.font = { bold: true };
  platformHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  summary.salesByPlatform.forEach((item) => {
    const platform = platforms.find((p) => p.id === item.platformId);
    platformSheet.addRow([
      platform?.name || `プラットフォームID: ${item.platformId}`,
      item.totalGross,
      item.bookingCount,
    ]);
  });

  platformSheet.getColumn("B").numFmt = "¥#,##0";
  platformSheet.getColumn("A").width = 25;
  platformSheet.getColumn("B").width = 15;
  platformSheet.getColumn("C").width = 12;

  // 日別売上シート
  const dailySheet = workbook.addWorksheet("日別売上");

  dailySheet.addRow(["日付", "売上", "予約件数"]);
  const dailyHeaderRow = dailySheet.getRow(1);
  dailyHeaderRow.font = { bold: true };
  dailyHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  dailySales.forEach((item) => {
    dailySheet.addRow([
      formatDate(item.date),
      item.totalGross,
      item.bookingCount,
    ]);
  });

  dailySheet.getColumn("B").numFmt = "¥#,##0";
  dailySheet.getColumn("A").width = 15;
  dailySheet.getColumn("B").width = 15;
  dailySheet.getColumn("C").width = 12;

  // ファイル保存
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = options.filename || `売上サマリー_${dateRange.startDate}_${dateRange.endDate}.xlsx`;
  saveAs(blob, filename);
}

// 予約一覧をExcel出力
export async function exportBookingsToExcel(
  bookings: Booking[],
  properties: Property[],
  platforms: Platform[],
  dateRange: { startDate: string; endDate: string },
  options: ExportOptions = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "レンタルスペース管理システム";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName || "予約一覧");

  // ヘッダー行
  sheet.addRow([
    "利用日",
    "予約日",
    "物件名",
    "プラットフォーム",
    "顧客名",
    "開始時間",
    "終了時間",
    "利用時間(分)",
    "売上(税込)",
    "売上(税抜)",
    "手数料",
    "ステータス",
  ]);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  // データ行
  bookings.forEach((booking) => {
    const property = properties.find((p) => p.id === booking.propertyId);
    const platform = platforms.find((p) => p.id === booking.platformId);

    sheet.addRow([
      formatDate(booking.usageDate),
      formatDate(booking.bookingDate),
      property?.name || `物件ID: ${booking.propertyId}`,
      platform?.name || `プラットフォームID: ${booking.platformId}`,
      booking.guestName || "-",
      booking.startTime || "-",
      booking.endTime || "-",
      booking.durationMinutes || "-",
      booking.grossAmount,
      booking.netAmount || "-",
      booking.commission || "-",
      booking.status,
    ]);
  });

  // 数値列のフォーマット
  sheet.getColumn("I").numFmt = "¥#,##0";
  sheet.getColumn("J").numFmt = "¥#,##0";
  sheet.getColumn("K").numFmt = "¥#,##0";

  // 列幅設定
  sheet.getColumn("A").width = 12;
  sheet.getColumn("B").width = 12;
  sheet.getColumn("C").width = 25;
  sheet.getColumn("D").width = 18;
  sheet.getColumn("E").width = 15;
  sheet.getColumn("F").width = 10;
  sheet.getColumn("G").width = 10;
  sheet.getColumn("H").width = 12;
  sheet.getColumn("I").width = 12;
  sheet.getColumn("J").width = 12;
  sheet.getColumn("K").width = 10;
  sheet.getColumn("L").width = 10;

  // フィルター追加
  sheet.autoFilter = {
    from: "A1",
    to: "L1",
  };

  // ファイル保存
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const filename = options.filename || `予約一覧_${dateRange.startDate}_${dateRange.endDate}.xlsx`;
  saveAs(blob, filename);
}
