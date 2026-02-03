import { useState, useEffect, useMemo } from "react";
import { Calendar, BarChart3, Users, TrendingUp, Grid3X3, RefreshCw, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { HeatmapChart } from "../components/analytics/HeatmapChart";
import { KpiDashboard } from "../components/analytics/KpiDashboard";
import { UsageAnalysis } from "../components/analytics/UsageAnalysis";
import { GuestCountAnalysis } from "../components/analytics/GuestCountAnalysis";
import { LeadTimeAnalysis } from "../components/analytics/LeadTimeAnalysis";

type TabType = "heatmap" | "usage" | "guest" | "kpi" | "leadtime";

const API_BASE = "http://localhost:5001";

export function Analytics() {
  const [activeTab, setActiveTab] = useState<TabType>("heatmap");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日付範囲（デフォルト: 過去1年）
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  // データ
  const [hourlyHeatmap, setHourlyHeatmap] = useState<any[]>([]);
  const [monthlyHeatmap, setMonthlyHeatmap] = useState<{ data: any[]; properties: any[] } | null>(
    null
  );
  const [usageData, setUsageData] = useState<any>(null);
  const [guestData, setGuestData] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any>(null);
  const [leadTimeData, setLeadTimeData] = useState<any>(null);
  const [priceRecommendations, setPriceRecommendations] = useState<any>(null);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      // 並列でデータ取得
      const [hourlyRes, monthlyRes, usageRes, guestRes, kpiRes, leadTimeRes, priceRecRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/heatmap/hourly?${params}`),
        fetch(`${API_BASE}/api/analytics/heatmap/monthly?year=${new Date().getFullYear()}`),
        fetch(`${API_BASE}/api/analytics/usage?${params}`),
        fetch(`${API_BASE}/api/analytics/guest-count?${params}`),
        fetch(`${API_BASE}/api/analytics/kpi?${params}`),
        fetch(`${API_BASE}/api/analytics/lead-time?${params}`),
        fetch(`${API_BASE}/api/analytics/price-recommendations?${params}`),
      ]);

      if (!hourlyRes.ok || !monthlyRes.ok || !usageRes.ok || !guestRes.ok || !kpiRes.ok) {
        throw new Error("データの取得に失敗しました");
      }

      const [hourly, monthly, usage, guest, kpi, leadTime, priceRec] = await Promise.all([
        hourlyRes.json(),
        monthlyRes.json(),
        usageRes.json(),
        guestRes.json(),
        kpiRes.json(),
        leadTimeRes.ok ? leadTimeRes.json() : null,
        priceRecRes.ok ? priceRecRes.json() : null,
      ]);

      setHourlyHeatmap(hourly.data || []);
      setMonthlyHeatmap(monthly);
      setUsageData(usage);
      setGuestData(guest);
      setKpiData(kpi);
      setLeadTimeData(leadTime);
      setPriceRecommendations(priceRec);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // ヒートマップ用のラベル
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
  const hourLabels = Array.from({ length: 15 }, (_, i) => `${i + 7}`); // 7時〜21時

  // 時間帯ヒートマップデータを変換
  const hourlyHeatmapData = useMemo(() => {
    return hourlyHeatmap.map((d) => ({
      x: String(d.hour),
      y: dayLabels[d.dayOfWeek],
      value: d.bookingCount,
    }));
  }, [hourlyHeatmap]);

  // 月次ヒートマップデータを変換
  const monthlyHeatmapData = useMemo(() => {
    if (!monthlyHeatmap) return [];
    return monthlyHeatmap.data.map((d) => ({
      x: String(d.month),
      y:
        monthlyHeatmap.properties.find((p: any) => p.id === d.propertyId)?.name ||
        `施設${d.propertyId}`,
      value: d.totalAmount,
    }));
  }, [monthlyHeatmap]);

  const monthLabels = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
  const propertyLabels = monthlyHeatmap?.properties.map((p: any) => p.name) || [];

  const tabs = [
    { id: "heatmap" as const, label: "ヒートマップ", icon: Grid3X3 },
    { id: "usage" as const, label: "用途分析", icon: BarChart3 },
    { id: "guest" as const, label: "人数分析", icon: Users },
    { id: "kpi" as const, label: "KPI指標", icon: TrendingUp },
    { id: "leadtime" as const, label: "リードタイム", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">分析</h1>
            <p className="text-sm text-gray-500">売上・稼働データの詳細分析</p>
          </div>
          <div className="flex items-center gap-4">
            {/* 期間選択 */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="border rounded px-2 py-1"
              />
              <span>〜</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="border rounded px-2 py-1"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              更新
            </button>
            <a
              href="/"
              className="text-sm text-blue-600 hover:underline"
            >
              ダッシュボードに戻る
            </a>
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* コンテンツ */}
      <main className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* ヒートマップタブ */}
            {activeTab === "heatmap" && (
              <div className="space-y-6">
                <HeatmapChart
                  data={hourlyHeatmapData}
                  xLabels={hourLabels}
                  yLabels={dayLabels}
                  title="曜日×時間帯別 予約件数"
                  valueLabel="件"
                  colorScale="blue"
                />

                {monthlyHeatmap && propertyLabels.length > 0 && (
                  <HeatmapChart
                    data={monthlyHeatmapData}
                    xLabels={monthLabels}
                    yLabels={propertyLabels}
                    title="施設×月別 売上"
                    valueLabel="円"
                    colorScale="green"
                  />
                )}

                {/* インサイト */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">分析インサイト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-800">ピーク時間帯</p>
                        <p className="text-blue-600">
                          {kpiData?.demand?.peakHours
                            ? `${kpiData.demand.peakHours.join("時, ")}時が最も予約が多い`
                            : "データなし"}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-800">ピーク曜日</p>
                        <p className="text-green-600">
                          {kpiData?.demand?.peakDays
                            ? `${kpiData.demand.peakDays.join("曜日, ")}曜日が人気`
                            : "データなし"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* 用途分析タブ */}
            {activeTab === "usage" && usageData && (
              <UsageAnalysis
                data={usageData.data}
                totalBookings={usageData.totalBookings}
                totalAmount={usageData.totalAmount}
              />
            )}

            {/* 人数分析タブ */}
            {activeTab === "guest" && guestData && (
              <GuestCountAnalysis
                data={guestData.data}
                avgGuestCount={guestData.avgGuestCount}
              />
            )}

            {/* KPI指標タブ */}
            {activeTab === "kpi" && kpiData && <KpiDashboard data={kpiData} />}

            {/* リードタイムタブ */}
            {activeTab === "leadtime" && leadTimeData && (
              <LeadTimeAnalysis
                distribution={leadTimeData.distribution || []}
                byPurpose={leadTimeData.byPurpose || []}
                byDayOfWeek={leadTimeData.byDayOfWeek || []}
                insights={leadTimeData.insights || {
                  avgLeadTime: 0,
                  lastMinuteRate: 0,
                  earlyBirdRate: 0,
                  lastMinuteCount: 0,
                  earlyBirdCount: 0,
                  totalBookings: 0,
                }}
                priceRecommendations={priceRecommendations?.recommendations || []}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default Analytics;
