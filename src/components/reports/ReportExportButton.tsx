import { useState, useRef, useEffect } from "react";
import { FileText, FileSpreadsheet, ChevronDown, Download } from "lucide-react";

export type ExportFormat = "pdf" | "excel";

interface ReportExportButtonProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ReportExportButton({
  onExport,
  loading = false,
  disabled = false,
  className = "",
}: ReportExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    setIsOpen(false);
    try {
      await onExport(format);
    } finally {
      setExporting(null);
    }
  };

  const isLoading = loading || exporting !== null;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin"
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
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span>
          {exporting === "pdf"
            ? "PDF出力中..."
            : exporting === "excel"
            ? "Excel出力中..."
            : "レポート出力"}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileText className="h-4 w-4 text-red-500" />
              <span>PDFでダウンロード</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("excel")}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span>Excelでダウンロード</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
