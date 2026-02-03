import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Users } from "lucide-react";

interface GuestCountData {
  guestRange: string;
  bookingCount: number;
  totalAmount: number;
  avgAmount: number;
}

interface GuestCountAnalysisProps {
  data: GuestCountData[];
  avgGuestCount: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#8b5cf6", "#64748b"];

const rangeOrder = ["1-5人", "6-10人", "11-20人", "21人以上", "未設定"];

export function GuestCountAnalysis({ data, avgGuestCount }: GuestCountAnalysisProps) {
  // データをソート
  const sortedData = [...data].sort(
    (a, b) => rangeOrder.indexOf(a.guestRange) - rangeOrder.indexOf(b.guestRange)
  );

  const chartData = sortedData.map((d, i) => ({
    name: d.guestRange,
    予約件数: d.bookingCount,
    売上: d.totalAmount,
    平均単価: Math.round(d.avgAmount),
    color: COLORS[i % COLORS.length],
  }));

  const totalBookings = data.reduce((sum, d) => sum + d.bookingCount, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.totalAmount, 0);

  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

  // 最も多い人数帯
  const mostPopular = sortedData.reduce(
    (max, d) => (d.bookingCount > max.bookingCount ? d : max),
    sortedData[0]
  );

  // 最も売上が高い人数帯
  const highestRevenue = sortedData.reduce(
    (max, d) => (d.totalAmount > max.totalAmount ? d : max),
    sortedData[0]
  );

  return (
    <div className="space-y-6">
      {/* 概要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">平均利用人数</p>
                <p className="text-2xl font-bold">{avgGuestCount.toFixed(1)}人</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">最多人数帯</p>
            <p className="text-2xl font-bold text-green-600">{mostPopular?.guestRange || "—"}</p>
            <p className="text-xs text-gray-400">{mostPopular?.bookingCount || 0}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">最高売上人数帯</p>
            <p className="text-2xl font-bold text-orange-600">
              {highestRevenue?.guestRange || "—"}
            </p>
            <p className="text-xs text-gray-400">
              {formatCurrency(highestRevenue?.totalAmount || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">1人あたり平均単価</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                avgGuestCount > 0 ? totalAmount / (totalBookings * avgGuestCount) : 0
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 人数帯別予約件数 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">人数帯別予約件数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="予約件数" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 人数帯別売上構成比 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">人数帯別売上構成比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.filter((d) => d.売上 > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="売上"
                    label={({ name, 売上 }: any) =>
                      totalAmount > 0 && (売上 / totalAmount) * 100 > 5
                        ? `${name}`
                        : ""
                    }
                    labelLine={false}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => typeof value === 'number' ? [formatCurrency(value), "売上"] : null} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人数帯別詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">人数帯</th>
                  <th className="text-right py-2 px-3">予約件数</th>
                  <th className="text-right py-2 px-3">売上</th>
                  <th className="text-right py-2 px-3">平均単価</th>
                  <th className="text-right py-2 px-3">構成比</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </td>
                    <td className="text-right py-2 px-3">{item.予約件数.toLocaleString()}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(item.売上)}</td>
                    <td className="text-right py-2 px-3">{formatCurrency(item.平均単価)}</td>
                    <td className="text-right py-2 px-3">
                      {totalAmount > 0 ? ((item.売上 / totalAmount) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GuestCountAnalysis;
