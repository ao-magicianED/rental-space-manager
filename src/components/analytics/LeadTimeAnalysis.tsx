import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Clock, TrendingUp, TrendingDown, AlertCircle, DollarSign } from "lucide-react";

interface LeadTimeDistribution {
  leadTimeDays: number;
  bookingCount: number;
  avgAmount: number;
  totalAmount: number;
}

interface LeadTimeByPurpose {
  purpose: string | null;
  avgLeadTime: number;
  bookingCount: number;
  avgAmount: number;
}

interface LeadTimeByDayOfWeek {
  dayOfWeek: number;
  avgLeadTime: number;
  bookingCount: number;
}

interface LeadTimeInsights {
  avgLeadTime: number;
  lastMinuteRate: number;
  earlyBirdRate: number;
  lastMinuteCount: number;
  earlyBirdCount: number;
  totalBookings: number;
}

interface PriceRecommendation {
  type: "INCREASE" | "DECREASE" | "MAINTAIN";
  target: string;
  dayOfWeek: number;
  hour: number;
  currentBookings: number;
  avgAmount: number;
  occupancyRate: number;
  reason: string;
  suggestedAction: string;
  confidence: number;
}

interface LeadTimeAnalysisProps {
  distribution: LeadTimeDistribution[];
  byPurpose: LeadTimeByPurpose[];
  byDayOfWeek: LeadTimeByDayOfWeek[];
  insights: LeadTimeInsights;
  priceRecommendations?: PriceRecommendation[];
}

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

export function LeadTimeAnalysis({
  distribution,
  byPurpose,
  byDayOfWeek,
  insights,
  priceRecommendations = [],
}: LeadTimeAnalysisProps) {
  const [distributionTab, setDistributionTab] = useState<"count" | "price">("count");
  const [breakdownTab, setBreakdownTab] = useState<"dayOfWeek" | "purpose">("dayOfWeek");

  const formatCurrency = (value: number) => `¥${Math.round(value).toLocaleString()}`;

  // 分布データを0-30日に限定
  const distributionData = distribution
    .filter((d) => d.leadTimeDays >= 0 && d.leadTimeDays <= 30)
    .map((d) => ({
      日数: d.leadTimeDays,
      予約件数: d.bookingCount,
      平均単価: Math.round(d.avgAmount),
    }));

  // 曜日別データ
  const dayOfWeekData = byDayOfWeek.map((d) => ({
    曜日: dayNames[d.dayOfWeek],
    平均リードタイム: Math.round(d.avgLeadTime * 10) / 10,
    予約件数: d.bookingCount,
  }));

  // 用途別データ（上位8件）
  const purposeData = byPurpose
    .filter((d) => d.purpose)
    .slice(0, 8)
    .map((d) => ({
      用途: d.purpose || "未設定",
      平均リードタイム: Math.round(d.avgLeadTime * 10) / 10,
      予約件数: d.bookingCount,
      平均単価: Math.round(d.avgAmount),
    }));

  return (
    <div className="space-y-6">
      {/* インサイトカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">平均リードタイム</p>
                <p className="text-2xl font-bold">{insights.avgLeadTime.toFixed(1)}日</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm text-slate-500">直前予約（3日以内）</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(insights.lastMinuteRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400">{insights.lastMinuteCount}件</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-slate-500">早期予約（14日以上）</p>
                <p className="text-2xl font-bold text-green-600">
                  {(insights.earlyBirdRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400">{insights.earlyBirdCount}件</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">分析対象予約数</p>
            <p className="text-2xl font-bold">{insights.totalBookings.toLocaleString()}件</p>
          </CardContent>
        </Card>
      </div>

      {/* リードタイム分布 / 単価 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">リードタイム分布</CardTitle>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              <button
                onClick={() => setDistributionTab("count")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  distributionTab === "count"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                予約件数
              </button>
              <button
                onClick={() => setDistributionTab("price")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  distributionTab === "price"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                平均単価
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              {distributionTab === "count" ? (
                <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="日数" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => {
                      if (typeof value !== 'number') return null;
                      if (name === "平均単価") return [formatCurrency(value), name];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="予約件数" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="日数" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => typeof value === 'number' ? [formatCurrency(value), "平均単価"] : null} />
                  <Line
                    type="monotone"
                    dataKey="平均単価"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: "#22c55e", strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {distributionTab === "count"
              ? "横軸: 予約日から利用日までの日数"
              : "直前予約の単価傾向を確認"}
          </p>
        </CardContent>
      </Card>

      {/* 曜日別 / 用途別 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">リードタイム内訳</CardTitle>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              <button
                onClick={() => setBreakdownTab("dayOfWeek")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  breakdownTab === "dayOfWeek"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                曜日別
              </button>
              <button
                onClick={() => setBreakdownTab("purpose")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  breakdownTab === "purpose"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                用途別
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              {breakdownTab === "dayOfWeek" ? (
                <BarChart data={dayOfWeekData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="曜日" />
                  <YAxis unit="日" />
                  <Tooltip />
                  <Bar dataKey="平均リードタイム" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart
                  data={purposeData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="日" />
                  <YAxis type="category" dataKey="用途" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="平均リードタイム" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 価格レコメンド */}
      {priceRecommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              価格最適化レコメンド
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priceRecommendations.slice(0, 6).map((rec, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    rec.type === "INCREASE"
                      ? "bg-green-50 border-green-200"
                      : rec.type === "DECREASE"
                      ? "bg-orange-50 border-orange-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {rec.type === "INCREASE" ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                        )}
                        <span className="font-medium">{rec.target}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            rec.type === "INCREASE"
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {rec.type === "INCREASE" ? "値上げ推奨" : "値下げ推奨"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{rec.reason}</p>
                      <p className="text-sm font-medium mt-1">{rec.suggestedAction}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">稼働率</p>
                      <p className="font-bold">{rec.occupancyRate.toFixed(0)}%</p>
                      <p className="text-xs text-slate-500 mt-1">信頼度</p>
                      <p className="text-sm">{(rec.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分析サマリー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">リードタイム分析サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-800">直前予約の傾向</p>
              <p className="text-blue-600">
                {insights.lastMinuteRate > 0.3
                  ? "直前予約が多い傾向。当日・前日料金の設定を検討"
                  : insights.lastMinuteRate > 0.15
                  ? "適度な直前予約あり。バランス良好"
                  : "直前予約は少なめ。早期予約割引が効果的かも"}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="font-medium text-green-800">早期予約の傾向</p>
              <p className="text-green-600">
                {insights.earlyBirdRate > 0.2
                  ? "早期予約が多い。安定した予約パターン"
                  : insights.earlyBirdRate > 0.1
                  ? "早期予約割引で更に促進可能"
                  : "早期予約は少なめ。割引キャンペーンを検討"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default LeadTimeAnalysis;
