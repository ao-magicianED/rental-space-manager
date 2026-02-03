/**
 * 立地スコアゲージコンポーネント
 * Phase 4: 位置情報インテリジェンス
 */

interface LocationScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showValue?: boolean;
}

const sizeConfig = {
  sm: { container: "w-10 h-10", text: "text-xs", label: "text-[10px]" },
  md: { container: "w-14 h-14", text: "text-sm", label: "text-xs" },
  lg: { container: "w-20 h-20", text: "text-lg", label: "text-sm" },
};

export function LocationScoreGauge({
  score,
  size = "md",
  showLabel = true,
  showValue = true,
}: LocationScoreGaugeProps) {
  const { container, text, label } = sizeConfig[size];

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600" };
    if (s >= 60) return { stroke: "#3b82f6", bg: "bg-blue-50", text: "text-blue-600" };
    if (s >= 40) return { stroke: "#f59e0b", bg: "bg-amber-50", text: "text-amber-600" };
    if (s >= 20) return { stroke: "#f97316", bg: "bg-orange-50", text: "text-orange-600" };
    return { stroke: "#ef4444", bg: "bg-red-50", text: "text-red-600" };
  };

  const getRank = (s: number) => {
    if (s >= 80) return "A";
    if (s >= 60) return "B";
    if (s >= 40) return "C";
    if (s >= 20) return "D";
    return "E";
  };

  const colors = getColor(score);
  const rank = getRank(score);
  const circumference = 2 * Math.PI * 15.9155;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* 円形ゲージ */}
      <div className={`${container} relative`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          {/* 背景円 */}
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="3"
          />
          {/* スコア円 */}
          <circle
            cx="18"
            cy="18"
            r="15.9155"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold ${text}`}>{score}</span>
          </div>
        )}
      </div>
      {showLabel && (
        <span className={`font-semibold ${label} ${colors.text}`}>
          {rank}ランク
        </span>
      )}
    </div>
  );
}

/**
 * 立地スコアバッジ（コンパクト表示用）
 */
interface LocationScoreBadgeProps {
  score: number;
}

export function LocationScoreBadge({ score }: LocationScoreBadgeProps) {
  const getStyle = (s: number) => {
    if (s >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s >= 60) return "bg-blue-100 text-blue-700 border-blue-200";
    if (s >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
    if (s >= 20) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const getRank = (s: number) => {
    if (s >= 80) return "A";
    if (s >= 60) return "B";
    if (s >= 40) return "C";
    if (s >= 20) return "D";
    return "E";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getStyle(
        score
      )}`}
    >
      <span>{score}</span>
      <span className="opacity-70">({getRank(score)})</span>
    </span>
  );
}

export default LocationScoreGauge;
