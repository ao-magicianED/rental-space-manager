import { useState, useEffect, useMemo } from "react";
import { Calendar, BarChart3, Users, TrendingUp, Grid3X3, RefreshCw, Clock } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
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
    <PageLayout
      title="分析"
      description="売上・稼働データの詳細分析"
      actions={
        <div className="flex items-center gap-3">
          {/* 期間選択 */}
          <div className="flex items-center gap-2 text-sm bg-white rounded-xl border border-slate-200 px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
              }
              className="border-none focus:ring-0 text-sm"
            />
            <span className="text-slate-400">〜</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
              }
              className="border-none focus:ring-0 text-sm"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            更新
          </button>
        </div>
      }
    >
      {/* タブナビゲーション */}
      <div className="mb-6 -mt-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium">エラーが発生しました</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
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
        <>
          {/* ヒートマップタブ */}
          {activeTab === "heatmap" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <HeatmapChart
                  data={hourlyHeatmapData}
                  xLabels={hourLabels}
                  yLabels={dayLabels}
                  title="曜日×時間帯別 予約件数"
                  valueLabel="件"
                  colorScale="blue"
                />
              </div>

              {monthlyHeatmap && propertyLabels.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <HeatmapChart
                    data={monthlyHeatmapData}
                    xLabels={monthLabels}
                    yLabels={propertyLabels}
                    title="施設×月別 売上"
                    valueLabel="円"
                    colorScale="green"
                  />
                </div>
              )}

              {/* インサイト */}
              <Card className="rounded-2xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">分析インサイト</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                      <p className="font-medium text-blue-800">ピーク時間帯</p>
                      <p className="text-blue-600 mt-1">
                        {kpiData?.demand?.peakHours
                          ? `${kpiData.demand.peakHours.join("時, ")}時が最も予約が多い`
                          : "データなし"}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                      <p className="font-medium text-emerald-800">ピーク曜日</p>
                      <p className="text-emerald-600 mt-1">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <UsageAnalysis
                data={usageData.data}
                totalBookings={usageData.totalBookings}
                totalAmount={usageData.totalAmount}
              />
            </div>
          )}

          {/* 人数分析タブ */}
          {activeTab === "guest" && guestData && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <GuestCountAnalysis
                data={guestData.data}
                avgGuestCount={guestData.avgGuestCount}
              />
            </div>
          )}

          {/* KPI指標タブ */}
          {activeTab === "kpi" && kpiData && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <KpiDashboard data={kpiData} />
            </div>
          )}

          {/* リードタイムタブ */}
          {activeTab === "leadtime" && leadTimeData && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

export default Analytics;
