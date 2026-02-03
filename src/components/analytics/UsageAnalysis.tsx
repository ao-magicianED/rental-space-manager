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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface UsageData {
  purpose: string | null;
  bookingCount: number;
  totalAmount: number;
  avgAmount: number;
  avgDuration: number;
  totalGuests: number;
}

interface UsageAnalysisProps {
  data: UsageData[];
  totalBookings: number;
  totalAmount: number;
}

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
];

export function UsageAnalysis({ data, totalBookings, totalAmount }: UsageAnalysisProps) {
  // データを整形
  const chartData = data.map((d, i) => ({
    name: d.purpose || "未設定",
    予約件数: d.bookingCount,
    売上: d.totalAmount,
    平均単価: Math.round(d.avgAmount),
    平均時間: Math.round(d.avgDuration),
    構成比: totalAmount > 0 ? (d.totalAmount / totalAmount) * 100 : 0,
    color: COLORS[i % COLORS.length],
  }));

  // 売上トップ5を表示
  const topUsages = chartData.slice(0, 8);

  const formatCurrency = (value: number) =>
    `¥${value.toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* 概要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">用途の種類</p>
            <p className="text-2xl font-bold">{data.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">総予約件数</p>
            <p className="text-2xl font-bold">{totalBookings.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">総売上</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">平均単価</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalBookings > 0 ? totalAmount / totalBookings : 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用途別売上 棒グラフ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">用途別売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topUsages}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      value >= 10000 ? `${(value / 10000).toFixed(0)}万` : value.toLocaleString()
                    }
                  />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "売上"]}
                  />
                  <Bar dataKey="売上" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 用途別構成比 円グラフ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">用途別構成比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topUsages}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="売上"
                    label={({ name, 構成比 }) =>
                      構成比 > 5 ? `${name} ${構成比.toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {topUsages.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "売上"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">用途別詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">用途</th>
                  <th className="text-right py-2 px-3">予約件数</th>
                  <th className="text-right py-2 px-3">売上</th>
                  <th className="text-right py-2 px-3">平均単価</th>
                  <th className="text-right py-2 px-3">平均時間</th>
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
                    <td className="text-right py-2 px-3">{item.平均時間}分</td>
                    <td className="text-right py-2 px-3">{item.構成比.toFixed(1)}%</td>
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

export default UsageAnalysis;
