import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // 前期比（%）
  icon?: React.ReactNode;
  valueColor?: "default" | "success" | "warning" | "danger";
  variant?: "blue" | "green" | "purple" | "orange" | "default";
}

const variantStyles = {
  default: {
    bg: "bg-white",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    border: "border-slate-200",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
    iconColor: "text-white",
    border: "border-blue-200",
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    iconBg: "bg-gradient-to-br from-emerald-500 to-teal-600",
    iconColor: "text-white",
    border: "border-emerald-200",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50 to-violet-50",
    iconBg: "bg-gradient-to-br from-purple-500 to-violet-600",
    iconColor: "text-white",
    border: "border-purple-200",
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-50 to-amber-50",
    iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
    iconColor: "text-white",
    border: "border-orange-200",
  },
};

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  valueColor = "default",
  variant = "default",
}: KpiCardProps) {
  const colorClasses = {
    default: "text-slate-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) {
      return <Minus className="h-4 w-4 text-slate-400" />;
    }
    if (trend > 0) {
      return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-slate-500";
    return trend > 0 ? "text-emerald-600" : "text-red-600";
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* 背景の装飾 */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/40 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${colorClasses[valueColor]}`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${styles.iconBg} ${styles.iconColor} shadow-lg`}>
            {icon}
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-200/50">
          <div className="flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1">
            {getTrendIcon()}
            <span className={`text-sm font-semibold ${getTrendColor()}`}>
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-slate-500">前月比</span>
        </div>
      )}
    </div>
  );
}

export default KpiCard;
