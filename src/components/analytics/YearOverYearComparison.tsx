import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { api } from "../../lib/api";
import type { YearOverYearComparison as YoYData, Property } from "../../lib/api";

interface YearOverYearComparisonProps {
  startDate: string;
  endDate: string;
  properties: Property[];
}

const formatCurrency = (value: number): string => `¥${value.toLocaleString()}`;
const formatPercent = (value: number): string => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export function YearOverYearComparison({
  startDate,
  endDate,
  properties,
}: YearOverYearComparisonProps) {
  const [data, setData] = useState<YoYData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getYearOverYearComparison({ startDate, endDate });
        setData(result);
      } catch (e) {
        console.error("Error fetching comparison data:", e);
        setError("比較データの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        {error || "データがありません"}
      </div>
    );
  }

  // 月別比較データの整形
  const currentYear = new Date(startDate).getFullYear();
  const previousYear = currentYear - 1;

  const monthlyChartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const currentData = data.monthlyTrends.find(
      (t) => t.year === currentYear && t.month === month
    );
    const previousData = data.monthlyTrends.find(
      (t) => t.year === previousYear && t.month === month
    );

    return {
      month: `${month}月`,
      [currentYear]: currentData?.totalGross || 0,
      [previousYear]: previousData?.totalGross || 0,
    };
  });

  // 物件別比較データの整形
  const propertyChartData = properties.map((property) => {
    const currentData = data.propertyComparison.find(
      (p) => p.propertyId === property.id && p.year === currentYear
    );
    const previousData = data.propertyComparison.find(
      (p) => p.propertyId === property.id && p.year === previousYear
    );

    return {
      name: property.name.length > 10 ? property.name.slice(0, 10) + "..." : property.name,
      [currentYear]: currentData?.totalGross || 0,
      [previousYear]: previousData?.totalGross || 0,
    };
  });

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-4 w-4" />
          {formatPercent(value)}
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="flex items-center gap-1 text-red-500">
          <TrendingDown className="h-4 w-4" />
          {formatPercent(value)}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-slate-500">
        <Minus className="h-4 w-4" />
        0%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* 売上比較 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">売上</span>
            <ChangeIndicator value={data.changes.revenue} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(data.current.totalGross)}
            </div>
            <div className="text-sm text-slate-400">
              前年: {formatCurrency(data.previous.totalGross)}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            差額: {formatCurrency(data.changes.revenueAbsolute)}
          </div>
        </div>

        {/* 予約件数比較 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">予約件数</span>
            <ChangeIndicator value={data.changes.bookings} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900">
              {data.current.bookingCount}件
            </div>
            <div className="text-sm text-slate-400">
              前年: {data.previous.bookingCount}件
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            差: {data.changes.bookingsAbsolute > 0 ? "+" : ""}{data.changes.bookingsAbsolute}件
          </div>
        </div>

        {/* 平均単価比較 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">平均単価</span>
            <ChangeIndicator value={data.changes.avgAmount} />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900">
              {formatCurrency(Math.round(data.current.avgAmount))}
            </div>
            <div className="text-sm text-slate-400">
              前年: {formatCurrency(Math.round(data.previous.avgAmount))}
            </div>
          </div>
        </div>
      </div>

      {/* 期間表示 */}
      <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>当期: {data.current.period.start} 〜 {data.current.period.end}</span>
        </div>
        <span>vs</span>
        <span>前年同期: {data.previous.period.start} 〜 {data.previous.period.end}</span>
      </div>

      {/* 月別推移グラフ */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">月別売上推移（前年比較）</h3>
        <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
          <LineChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
            <Tooltip
              formatter={(value) => typeof value === "number" ? [formatCurrency(value), ""] : null}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={currentYear}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name={`${currentYear}年`}
            />
            <Line
              type="monotone"
              dataKey={previousYear}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4 }}
              name={`${previousYear}年`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 物件別比較グラフ */}
      {propertyChartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">物件別売上比較</h3>
          <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
            <BarChart data={propertyChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`}
              />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip
                formatter={(value) => typeof value === "number" ? [formatCurrency(value), ""] : null}
              />
              <Legend />
              <Bar dataKey={currentYear} fill="#3b82f6" name={`${currentYear}年`} />
              <Bar dataKey={previousYear} fill="#94a3b8" name={`${previousYear}年`} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default YearOverYearComparison;
