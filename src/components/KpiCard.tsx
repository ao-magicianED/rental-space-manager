import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "./ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // 前期比（%）
  icon?: React.ReactNode;
  valueColor?: "default" | "success" | "warning" | "danger";
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  valueColor = "default",
}: KpiCardProps) {
  const colorClasses = {
    default: "text-gray-900",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-gray-500";
    return trend > 0 ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${colorClasses[valueColor]}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">{icon}</div>
        )}
      </div>
      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-1">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
          <span className="text-sm text-gray-500">前月比</span>
        </div>
      )}
    </Card>
  );
}

export default KpiCard;
