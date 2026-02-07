import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { TrendingUp, TrendingDown, Users, Clock, DollarSign, Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface KpiData {
  revenue: {
    total: number;
    net: number;
  };
  customer: {
    uniqueGuests: number;
    repeatGuests: number;
    repeatRate: number;
    avgBookingsPerGuest: number;
    estimatedLtv: number;
  };
  occupancy: {
    availableMinutes: number;
    usedMinutes: number;
    occupancyRate: number;
    avgDailyBookings: number;
  };
  pricing: {
    avgPerBooking: number;
    avgPerHour: number;
    avgPerGuest: number;
    revPAR: number;
  };
  demand: {
    peakDays: string[];
    offPeakDays: string[];
    peakHours: number[];
    offPeakHours: number[];
    weekdayWeekendRatio: number;
  };
  seasonality: {
    monthly: Array<{ month: number; total: number; count: number }>;
  };
}

interface KpiDashboardProps {
  data: KpiData;
}

function KpiCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  color = "blue",
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color?: "blue" | "green" | "orange" | "purple";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subValue && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                {trend === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
                {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                {subValue}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiDashboard({ data }: KpiDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    revenue: true,
    customer: false,
    occupancy: false,
    demand: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (value: number) =>
    `¥${Math.round(value).toLocaleString()}`;

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const formatHours = (value: number[]) =>
    value.map((h) => `${h}時`).join(", ");

  const SectionHeader = ({
    sectionKey,
    icon: Icon,
    iconColor,
    label,
    summary,
  }: {
    sectionKey: string;
    icon: React.ElementType;
    iconColor: string;
    label: string;
    summary?: string;
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between py-2 group"
    >
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        {label}
      </h3>
      <div className="flex items-center gap-3">
        {!expandedSections[sectionKey] && summary && (
          <span className="text-sm text-slate-400">{summary}</span>
        )}
        {expandedSections[sectionKey] ? (
          <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        )}
      </div>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 収益指標 */}
      <div>
        <SectionHeader
          sectionKey="revenue"
          icon={DollarSign}
          iconColor="text-green-600"
          label="収益指標"
          summary={formatCurrency(data.revenue.total)}
        />
        {expandedSections.revenue && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <KpiCard
              title="総売上"
              value={formatCurrency(data.revenue.total)}
              icon={DollarSign}
              color="green"
            />
            <KpiCard
              title="純収入（手数料控除後）"
              value={formatCurrency(data.revenue.net)}
              subValue={`手数料: ${formatCurrency(data.revenue.total - data.revenue.net)}`}
              icon={DollarSign}
              color="green"
            />
            <KpiCard
              title="1予約あたり単価"
              value={formatCurrency(data.pricing.avgPerBooking)}
              icon={DollarSign}
              color="blue"
            />
            <KpiCard
              title="RevPAR"
              value={formatCurrency(data.pricing.revPAR)}
              subValue="時間あたり売上"
              icon={TrendingUp}
              color="blue"
            />
          </div>
        )}
      </div>

      {/* 顧客指標 */}
      <div>
        <SectionHeader
          sectionKey="customer"
          icon={Users}
          iconColor="text-purple-600"
          label="顧客指標"
          summary={`${data.customer.uniqueGuests}人`}
        />
        {expandedSections.customer && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <KpiCard
              title="ユニーク顧客数"
              value={data.customer.uniqueGuests.toLocaleString()}
              subValue="人"
              icon={Users}
              color="purple"
            />
            <KpiCard
              title="リピーター数"
              value={data.customer.repeatGuests.toLocaleString()}
              subValue="人（2回以上予約）"
              icon={Users}
              color="purple"
            />
            <KpiCard
              title="リピート率"
              value={formatPercent(data.customer.repeatRate)}
              trend={data.customer.repeatRate > 20 ? "up" : "neutral"}
              icon={TrendingUp}
              color="purple"
            />
            <KpiCard
              title="推定LTV"
              value={formatCurrency(data.customer.estimatedLtv)}
              subValue="顧客生涯価値"
              icon={DollarSign}
              color="purple"
            />
          </div>
        )}
      </div>

      {/* 稼働指標 */}
      <div>
        <SectionHeader
          sectionKey="occupancy"
          icon={Clock}
          iconColor="text-orange-600"
          label="稼働指標"
          summary={formatPercent(data.occupancy.occupancyRate)}
        />
        {expandedSections.occupancy && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <KpiCard
              title="稼働率"
              value={formatPercent(data.occupancy.occupancyRate)}
              trend={data.occupancy.occupancyRate > 30 ? "up" : "down"}
              icon={Clock}
              color="orange"
            />
            <KpiCard
              title="1日平均予約数"
              value={data.occupancy.avgDailyBookings.toFixed(1)}
              subValue="件/日"
              icon={Calendar}
              color="orange"
            />
            <KpiCard
              title="1時間あたり単価"
              value={formatCurrency(data.pricing.avgPerHour)}
              icon={DollarSign}
              color="blue"
            />
            <KpiCard
              title="1人あたり単価"
              value={formatCurrency(data.pricing.avgPerGuest)}
              icon={Users}
              color="blue"
            />
          </div>
        )}
      </div>

      {/* 需要分析 */}
      <div>
        <SectionHeader
          sectionKey="demand"
          icon={Calendar}
          iconColor="text-blue-600"
          label="需要分析"
          summary={data.demand.peakDays.length > 0 ? `ピーク: ${data.demand.peakDays.join(",")}` : undefined}
        />
        {expandedSections.demand && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  ピーク・オフピーク
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ピーク曜日:</span>
                    <span className="font-medium text-green-600">
                      {data.demand.peakDays.join(", ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">オフピーク曜日:</span>
                    <span className="font-medium text-red-500">
                      {data.demand.offPeakDays.join(", ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ピーク時間帯:</span>
                    <span className="font-medium text-green-600">
                      {formatHours(data.demand.peakHours) || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">平日/休日比:</span>
                    <span className="font-medium">
                      {data.demand.weekdayWeekendRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  月別売上トップ3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {data.seasonality.monthly
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 3)
                    .map((m, i) => (
                      <div key={m.month} className="flex justify-between items-center">
                        <span className="text-slate-500">{m.month}月:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(m.total)}
                          </span>
                          {i === 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                              1位
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default KpiDashboard;
