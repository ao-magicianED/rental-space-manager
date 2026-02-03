import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Building2,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  RefreshCw,
  Upload,
  Settings,
  BarChart3,
} from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { SalesChart } from "../components/SalesChart";
import { PropertySalesChart } from "../components/PropertySalesChart";
import { PlatformPieChart } from "../components/PlatformPieChart";
import { DateRangePicker } from "../components/DateRangePicker";
import { api } from "../lib/api";
import type { Platform, Property, DashboardSummary, DailySales } from "../lib/api";

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

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                レンタルスペース売上管理
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                ダッシュボード
              </p>
            </div>
            <div className="flex items-center gap-4">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={handleDateChange}
              />
              <a
                href="#import"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload className="h-4 w-4" />
                CSVインポート
              </a>
              <a
                href="#analytics"
                className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                <BarChart3 className="h-4 w-4" />
                分析
              </a>
              <a
                href="#settings"
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                設定
              </a>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                更新
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && !summary ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* KPIカード */}
            <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="売上（税込）"
                value={`¥${(summary?.totalGross || 0).toLocaleString()}`}
                icon={<DollarSign className="h-6 w-6" />}
              />
              <KpiCard
                title="予約件数"
                value={summary?.bookingCount || 0}
                subtitle="件"
                icon={<CalendarCheck className="h-6 w-6" />}
              />
              <KpiCard
                title="稼働率"
                value={`${calculateOccupancyRate()}%`}
                icon={<TrendingUp className="h-6 w-6" />}
              />
              <KpiCard
                title="粗利"
                value={`¥${(summary?.grossProfit || 0).toLocaleString()}`}
                valueColor={
                  (summary?.grossProfit || 0) >= 0 ? "success" : "danger"
                }
                icon={<Building2 className="h-6 w-6" />}
              />
            </div>

            {/* グラフエリア */}
            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <SalesChart data={dailySales} />
              <PlatformPieChart
                salesData={summary?.salesByPlatform || []}
                platforms={platforms}
              />
            </div>

            {/* 店舗別売上 */}
            <div className="mb-8">
              <PropertySalesChart
                salesData={summary?.salesByProperty || []}
                properties={properties}
              />
            </div>

            {/* データなしの場合 */}
            {summary?.bookingCount === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  データがありません
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  CSVファイルをインポートして、売上データを追加してください。
                </p>
                <a
                  href="#import"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  CSVインポート
                </a>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
