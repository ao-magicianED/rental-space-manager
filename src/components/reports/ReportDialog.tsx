import { useState } from "react";
import { X, FileText, FileSpreadsheet, Calendar } from "lucide-react";

export type ReportType = "sales-summary" | "bookings" | "property-performance";
export type ExportFormat = "pdf" | "excel";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    reportType: ReportType,
    format: ExportFormat,
    dateRange: { startDate: string; endDate: string }
  ) => void | Promise<void>;
  loading?: boolean;
}

const reportTypes: { value: ReportType; label: string; description: string }[] = [
  {
    value: "sales-summary",
    label: "売上サマリー",
    description: "物件別・プラットフォーム別の売上集計",
  },
  {
    value: "bookings",
    label: "予約一覧",
    description: "予約の詳細リスト",
  },
  {
    value: "property-performance",
    label: "物件パフォーマンス",
    description: "物件ごとの稼働率・売上推移",
  },
];

export function ReportDialog({
  isOpen,
  onClose,
  onExport,
  loading = false,
}: ReportDialogProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales-summary");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("excel");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  if (!isOpen) return null;

  const handleExport = async () => {
    await onExport(selectedReport, selectedFormat, { startDate, endDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* ダイアログ */}
      <div className="relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">レポート出力</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* レポート種類選択 */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            レポートの種類
          </label>
          <div className="space-y-2">
            {reportTypes.map((report) => (
              <label
                key={report.value}
                className={`flex cursor-pointer items-start rounded-md border p-3 transition-colors ${
                  selectedReport === report.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="reportType"
                  value={report.value}
                  checked={selectedReport === report.value}
                  onChange={(e) => setSelectedReport(e.target.value as ReportType)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">
                    {report.label}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {report.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 期間選択 */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            <Calendar className="mr-1 inline h-4 w-4" />
            期間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-gray-500">〜</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 出力形式選択 */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            出力形式
          </label>
          <div className="flex gap-4">
            <label
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border p-3 transition-colors ${
                selectedFormat === "excel"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="excel"
                checked={selectedFormat === "excel"}
                onChange={() => setSelectedFormat("excel")}
                className="sr-only"
              />
              <FileSpreadsheet
                className={`h-5 w-5 ${
                  selectedFormat === "excel" ? "text-green-600" : "text-gray-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  selectedFormat === "excel" ? "text-green-700" : "text-gray-600"
                }`}
              >
                Excel
              </span>
            </label>
            <label
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border p-3 transition-colors ${
                selectedFormat === "pdf"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={selectedFormat === "pdf"}
                onChange={() => setSelectedFormat("pdf")}
                className="sr-only"
              />
              <FileText
                className={`h-5 w-5 ${
                  selectedFormat === "pdf" ? "text-red-500" : "text-gray-400"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  selectedFormat === "pdf" ? "text-red-700" : "text-gray-600"
                }`}
              >
                PDF
              </span>
            </label>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                出力中...
              </>
            ) : (
              "出力する"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
