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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  RefreshCw,
  Lightbulb,
} from "lucide-react";

const API_BASE = "http://localhost:5001";

interface ScenarioResult {
  monthlyRevenue: number;
  occupancyRate: number;
  roi: number;
  grossProfit: number;
}

interface SimilarProperty {
  id: number;
  name: string;
  similarity: number;
  monthlyRevenue: number;
  occupancyRate: number;
  areaTsubo: number | null;
  rent: number | null;
}

interface SimulationResult {
  scenarios: {
    pessimistic: ScenarioResult;
    realistic: ScenarioResult;
    optimistic: ScenarioResult;
  };
  similarProperties: SimilarProperty[];
  breakEvenMonths: number;
  monthlyBreakdown: {
    month: number;
    avgRevenue: number;
    seasonalIndex: number;
  }[];
  insights: string[];
}

interface SimulationPanelProps {
  prospectId?: number;
  initialRent?: number;
  initialAreaTsubo?: number;
  initialStation?: string;
  initialWalkMinutes?: number;
  onSimulationComplete?: (result: SimulationResult) => void;
}

export function SimulationPanel({
  prospectId,
  initialRent = 0,
  initialAreaTsubo,
  initialStation,
  initialWalkMinutes,
  onSimulationComplete,
}: SimulationPanelProps) {
  const [rent, setRent] = useState(initialRent);
  const [areaTsubo, setAreaTsubo] = useState(initialAreaTsubo || 0);
  const [station, setStation] = useState(initialStation || "");
  const [walkMinutes, setWalkMinutes] = useState(initialWalkMinutes || 0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;
  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  const runSimulation = async () => {
    if (rent <= 0) {
      setError("賃料を入力してください");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response;

      if (prospectId) {
        // 物件候補のシミュレーション
        response = await fetch(`${API_BASE}/api/property-prospects/${prospectId}/simulate`, {
          method: "POST",
        });
      } else {
        // 直接シミュレーション
        response = await fetch(`${API_BASE}/api/simulation/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rent,
            areaTsubo: areaTsubo || null,
            nearestStation: station || null,
            walkMinutes: walkMinutes || null,
          }),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "シミュレーション失敗");
      }

      const data = await response.json();
      const simResult = prospectId ? data.simulation : data;
      setResult(simResult);

      if (onSimulationComplete) {
        onSimulationComplete(simResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  // シナリオ比較用データ
  const scenarioData = result
    ? [
        {
          name: "悲観的",
          売上: result.scenarios.pessimistic.monthlyRevenue,
          利益: result.scenarios.pessimistic.grossProfit,
          ROI: result.scenarios.pessimistic.roi,
        },
        {
          name: "現実的",
          売上: result.scenarios.realistic.monthlyRevenue,
          利益: result.scenarios.realistic.grossProfit,
          ROI: result.scenarios.realistic.roi,
        },
        {
          name: "楽観的",
          売上: result.scenarios.optimistic.monthlyRevenue,
          利益: result.scenarios.optimistic.grossProfit,
          ROI: result.scenarios.optimistic.roi,
        },
      ]
    : [];

  // 月別予測データ
  const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  const monthlyData = result
    ? result.monthlyBreakdown.map((m) => ({
        月: monthNames[m.month - 1],
        予測売上: m.avgRevenue,
        季節指数: m.seasonalIndex,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            売上シミュレーション
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-500">賃料（円/月）*</label>
              <input
                type="number"
                value={rent || ""}
                onChange={(e) => setRent(parseInt(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2 mt-1"
                placeholder="100000"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">面積（坪）</label>
              <input
                type="number"
                step="0.1"
                value={areaTsubo || ""}
                onChange={(e) => setAreaTsubo(parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2 mt-1"
                placeholder="15"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">最寄駅</label>
              <input
                type="text"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
                placeholder="駒込"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">徒歩（分）</label>
              <input
                type="number"
                value={walkMinutes || ""}
                onChange={(e) => setWalkMinutes(parseInt(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2 mt-1"
                placeholder="5"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button
            onClick={runSimulation}
            disabled={loading || rent <= 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 font-medium"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                シミュレーション中...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                シミュレーション実行
              </>
            )}
          </button>
        </CardContent>
      </Card>

      {/* 結果表示 */}
      {result && (
        <>
          {/* KPIカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">予測月間売上</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(result.scenarios.realistic.monthlyRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {result.scenarios.realistic.grossProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm text-green-700">予測月間利益</span>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    result.scenarios.realistic.grossProfit >= 0 ? "text-green-800" : "text-red-600"
                  }`}
                >
                  {formatCurrency(result.scenarios.realistic.grossProfit)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700">ROI（売上/賃料）</span>
                </div>
                <p className="text-2xl font-bold text-purple-800">
                  {result.scenarios.realistic.roi.toFixed(2)}倍
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-orange-700">損益分岐点</span>
                </div>
                <p className="text-2xl font-bold text-orange-800">{result.breakEvenMonths}ヶ月</p>
              </CardContent>
            </Card>
          </div>

          {/* インサイト */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                分析インサイト
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.insights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3シナリオ比較 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3シナリオ比較</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scenarioData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} />
                      <Legend />
                      <Bar dataKey="売上" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="利益" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 月別予測 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">月別予測売上（季節変動）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="月" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "予測売上"]} />
                      <Line
                        type="monotone"
                        dataKey="予測売上"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 類似物件 */}
          {result.similarProperties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  類似物件の実績
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">施設名</th>
                        <th className="px-3 py-2 text-right">類似度</th>
                        <th className="px-3 py-2 text-right">月間売上</th>
                        <th className="px-3 py-2 text-right">稼働率</th>
                        <th className="px-3 py-2 text-right">賃料</th>
                        <th className="px-3 py-2 text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.similarProperties.map((sp) => (
                        <tr key={sp.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{sp.name}</td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                                sp.similarity >= 0.7
                                  ? "bg-green-100 text-green-700"
                                  : sp.similarity >= 0.5
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {Math.round(sp.similarity * 100)}%
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatCurrency(sp.monthlyRevenue)}
                          </td>
                          <td className="px-3 py-2 text-right">{formatPercent(sp.occupancyRate)}</td>
                          <td className="px-3 py-2 text-right">
                            {sp.rent ? formatCurrency(sp.rent) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {sp.rent && sp.rent > 0
                              ? `${(sp.monthlyRevenue / sp.rent).toFixed(2)}倍`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default SimulationPanel;
