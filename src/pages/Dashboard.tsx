import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Building2,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  RefreshCw,
  FileDown,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { KpiCard } from "../components/KpiCard";
import { SalesChart } from "../components/SalesChart";
import { PropertySalesChart } from "../components/PropertySalesChart";
import { PlatformPieChart } from "../components/PlatformPieChart";
import { DateRangePicker } from "../components/DateRangePicker";
import { ReportDialog, type ReportType, type ExportFormat } from "../components/reports/ReportDialog";
import { YearOverYearComparison } from "../components/analytics/YearOverYearComparison";
import { api } from "../lib/api";
import type { Platform, Property, DashboardSummary, DailySales } from "../lib/api";
import { exportSalesSummaryToExcel, exportBookingsToExcel } from "../lib/excel-generator";
import { exportDashboardToPdf } from "../lib/pdf-generator";

export function Dashboard() {
  const today = new Date();
  const [startDate, setStartDate] = useState(
    format(startOfMonth(today), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(today), "yyyy-MM-dd")
  );

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [platformsData, propertiesData, summaryData, salesData] =
        await Promise.all([
          api.getPlatforms(),
          api.getProperties(),
          api.getDashboardSummary({ startDate, endDate }),
          api.getDailySales({ startDate, endDate }),
        ]);

      setPlatforms(platformsData);
      setProperties(propertiesData);
      setSummary(summaryData);
      setDailySales(salesData);
    } catch (e) {
      console.error("Error fetching data:", e);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // 稼働率の計算（簡易版：予約数 / (施設数 * 日数)）
  const calculateOccupancyRate = () => {
    if (!summary || properties.length === 0) return 0;
    const days =
      (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24) +
      1;
    const maxBookings = properties.length * days;
    return maxBookings > 0
      ? ((summary.bookingCount / maxBookings) * 100).toFixed(1)
      : 0;
  };

  // レポート出力処理
  const handleExportReport = async (
    reportType: ReportType,
    format: ExportFormat,
    dateRange: { startDate: string; endDate: string }
  ) => {
    setExportLoading(true);
    try {
      if (format === "pdf") {
        // PDFはダッシュボード全体をキャプチャ
        await exportDashboardToPdf("dashboard-content", {
          filename: `ダッシュボード_${dateRange.startDate}_${dateRange.endDate}.pdf`,
        });
      } else {
        // Excel
        if (reportType === "sales-summary" || reportType === "property-performance") {
          const [summaryData, salesData] = await Promise.all([
            api.getDashboardSummary({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
            api.getDailySales({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
          ]);
          await exportSalesSummaryToExcel(
            summaryData,
            salesData,
            properties,
            platforms,
            dateRange
          );
        } else if (reportType === "bookings") {
          const bookings = await api.getBookings({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
          });
          await exportBookingsToExcel(bookings, properties, platforms, dateRange);
        }
      }
      setReportDialogOpen(false);
    } catch (e) {
      console.error("Export error:", e);
      alert("レポートの出力に失敗しました");
    } finally {
      setExportLoading(false);
    }
  };

  if (error) {
    return (
      <PageLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-slate-900">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              再試行
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="ダッシュボード"
      description="売上・予約の概要"
      actions={
        <>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
          />
          <button
            onClick={() => setReportDialogOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-white border border-slate-200 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden xs:inline">レポート</span>
            <span className="xs:hidden">出力</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">更新</span>
          </button>
        </>
      }
    >
      {loading && !summary ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 animate-ping opacity-20" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                <RefreshCw className="h-8 w-8 animate-spin text-white" />
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">データを読み込んでいます...</p>
          </div>
        </div>
      ) : (
        <div id="dashboard-content">
          {/* KPIカード */}
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="売上（税込）"
              value={`¥${(summary?.totalGross || 0).toLocaleString()}`}
              icon={<DollarSign className="h-6 w-6" />}
              variant="blue"
            />
            <KpiCard
              title="予約件数"
              value={summary?.bookingCount || 0}
              subtitle="件"
              icon={<CalendarCheck className="h-6 w-6" />}
              variant="green"
            />
            <KpiCard
              title="稼働率"
              value={`${calculateOccupancyRate()}%`}
              icon={<TrendingUp className="h-6 w-6" />}
              variant="purple"
            />
            <KpiCard
              title="粗利"
              value={`¥${(summary?.grossProfit || 0).toLocaleString()}`}
              valueColor={
                (summary?.grossProfit || 0) >= 0 ? "success" : "danger"
              }
              icon={<Building2 className="h-6 w-6" />}
              variant="orange"
            />
          </div>

          {/* グラフエリア */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SalesChart data={dailySales} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <PlatformPieChart
                salesData={summary?.salesByPlatform || []}
                platforms={platforms}
              />
            </div>
          </div>

          {/* 店舗別売上 */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <PropertySalesChart
              salesData={summary?.salesByProperty || []}
              properties={properties}
            />
          </div>

          {/* 前年同月比較セクション */}
          <div className="mb-8">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 text-left shadow-sm hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">前年同月比較</h3>
                  <p className="text-sm text-slate-500">売上・予約件数を前年と比較</p>
                </div>
              </div>
              {showComparison ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {showComparison && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <YearOverYearComparison
                  startDate={startDate}
                  endDate={endDate}
                  properties={properties}
                />
              </div>
            )}
          </div>

          {/* データなしの場合 */}
          {summary?.bookingCount === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">
                データがありません
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                CSVファイルをインポートして、売上データを追加してください。
              </p>
              <a
                href="#import"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                <Building2 className="h-4 w-4" />
                CSVインポート
              </a>
            </div>
          )}
        </div>
      )}

      {/* レポート出力ダイアログ */}
      <ReportDialog
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        onExport={handleExportReport}
        loading={exportLoading}
      />
    </PageLayout>
  );
}

export default Dashboard;
