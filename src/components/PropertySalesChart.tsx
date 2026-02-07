import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import type { Property } from "../lib/api";

interface PropertySalesData {
  propertyId: number;
  totalGross: number;
  bookingCount: number;
}

interface PropertySalesChartProps {
  salesData: PropertySalesData[];
  properties: Property[];
  title?: string;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export function PropertySalesChart({
  salesData,
  properties,
  title = "店舗別売上",
}: PropertySalesChartProps) {
  // プロパティ名をマッピング
  const chartData = salesData
    .map((item) => {
      const property = properties.find((p) => p.id === item.propertyId);
      return {
        name: property?.name || `施設${item.propertyId}`,
        売上: item.totalGross,
        予約数: item.bookingCount,
      };
    })
    .sort((a, b) => b.売上 - a.売上);

  // 金額フォーマット
  const formatAmount = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                tickFormatter={formatAmount}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value) => [
                  `¥${(value as number).toLocaleString()}`,
                  "売上",
                ]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="売上" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default PropertySalesChart;
