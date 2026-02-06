import { useMemo } from "react";

interface HeatmapData {
  x: number | string;
  y: number | string;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  xLabels: string[];
  yLabels: string[];
  title: string;
  valueLabel?: string;
  colorScale?: "blue" | "green" | "orange";
}

const colorScales = {
  blue: ["#f0f9ff", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"],
  green: ["#f0fdf4", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d"],
  orange: ["#fff7ed", "#fed7aa", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c"],
};

export function HeatmapChart({
  data,
  xLabels,
  yLabels,
  title,
  valueLabel = "値",
  colorScale = "blue",
}: HeatmapChartProps) {
  const { maxValue, grid } = useMemo(() => {
    // 最大値を計算
    const max = Math.max(...data.map((d) => d.value), 1);

    // グリッドデータを構築
    const gridData: Record<string, Record<string, number>> = {};
    for (const y of yLabels) {
      gridData[y] = {};
      for (const x of xLabels) {
        gridData[y][x] = 0;
      }
    }

    for (const d of data) {
      const yKey = String(d.y);
      const xKey = String(d.x);
      if (gridData[yKey] && xKey in gridData[yKey]) {
        gridData[yKey][xKey] = d.value;
      }
    }

    return { maxValue: max, grid: gridData };
  }, [data, xLabels, yLabels]);

  const getColor = (value: number) => {
    if (value === 0) return "#f8fafc";
    const scale = colorScales[colorScale];
    const ratio = value / maxValue;
    const index = Math.min(Math.floor(ratio * (scale.length - 1)), scale.length - 1);
    return scale[index];
  };

  const cellWidth = Math.max(30, Math.min(50, 600 / xLabels.length));
  const cellHeight = 28;
  const labelWidth = 40;
  const headerHeight = 30;

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <div style={{ minWidth: labelWidth + cellWidth * xLabels.length }}>
          {/* ヘッダー（X軸ラベル） */}
          <div className="flex" style={{ marginLeft: labelWidth }}>
            {xLabels.map((label) => (
              <div
                key={label}
                className="text-center text-xs text-slate-500 font-medium"
                style={{ width: cellWidth, height: headerHeight }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* グリッド */}
          {yLabels.map((yLabel) => (
            <div key={yLabel} className="flex items-center">
              {/* Y軸ラベル */}
              <div
                className="text-right text-xs text-slate-500 font-medium pr-2"
                style={{ width: labelWidth }}
              >
                {yLabel}
              </div>
              {/* セル */}
              {xLabels.map((xLabel) => {
                const value = grid[yLabel]?.[xLabel] || 0;
                return (
                  <div
                    key={`${yLabel}-${xLabel}`}
                    className="border border-slate-100 flex items-center justify-center text-xs cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                    style={{
                      width: cellWidth,
                      height: cellHeight,
                      backgroundColor: getColor(value),
                      color: value > maxValue * 0.5 ? "white" : "#374151",
                    }}
                    title={`${yLabel} ${xLabel}: ${value.toLocaleString()} ${valueLabel}`}
                  >
                    {value > 0 ? (value > 999 ? `${(value / 1000).toFixed(0)}k` : value) : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
        <span>少ない</span>
        <div className="flex">
          {colorScales[colorScale].map((color, i) => (
            <div
              key={i}
              className="w-4 h-4"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span>多い</span>
      </div>
    </div>
  );
}

export default HeatmapChart;
