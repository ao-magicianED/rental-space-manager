/**
 * 売上シミュレーションエンジン
 * 既存Blue Spaceデータを学習し、新規物件の売上を予測
 */

import { db } from "../db";
import { bookings, properties } from "../db/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

// シミュレーション入力
export interface SimulationInput {
  areaTsubo?: number | null;
  areaSqm?: number | null;
  rent: number;
  nearestStation?: string | null;
  walkMinutes?: number | null;
  capacity?: number | null;
  // Phase 4: 位置情報インテリジェンス
  stationPassengers?: number | null;
  nearbyCompanies?: number | null;
  locationScore?: number | null;
}

// シナリオ結果
export interface ScenarioResult {
  monthlyRevenue: number;
  occupancyRate: number;
  roi: number; // 売上/賃料
  grossProfit: number; // 売上 - 賃料
}

// 類似物件
export interface SimilarProperty {
  id: number;
  name: string;
  similarity: number;
  monthlyRevenue: number;
  occupancyRate: number;
  areaTsubo: number | null;
  rent: number | null;
}

// シミュレーション結果
export interface SimulationResult {
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

/**
 * 既存施設の統計データを取得
 */
async function getPropertyStats(startDate?: string, endDate?: string) {
  const conditions = [eq(bookings.status, "confirmed")];
  if (startDate) conditions.push(gte(bookings.usageDate, startDate));
  if (endDate) conditions.push(lte(bookings.usageDate, endDate));

  // 施設ごとの月間売上を計算
  const monthlyStats = await db
    .select({
      propertyId: bookings.propertyId,
      month: sql<string>`strftime('%Y-%m', ${bookings.usageDate})`,
      totalRevenue: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
      bookingCount: sql<number>`COUNT(*)`,
      totalMinutes: sql<number>`COALESCE(SUM(${bookings.durationMinutes}), 0)`,
    })
    .from(bookings)
    .where(and(...conditions))
    .groupBy(bookings.propertyId, sql`strftime('%Y-%m', ${bookings.usageDate})`);

  // 施設情報を取得
  const allProperties = await db.select().from(properties);

  // 施設ごとの統計を集計
  const propertyStats = new Map<
    number,
    {
      property: (typeof allProperties)[0];
      monthlyRevenues: number[];
      avgMonthlyRevenue: number;
      totalRevenue: number;
      totalBookings: number;
      totalMinutes: number;
      monthCount: number;
    }
  >();

  for (const stat of monthlyStats) {
    if (!stat.propertyId) continue;

    if (!propertyStats.has(stat.propertyId)) {
      const property = allProperties.find((p) => p.id === stat.propertyId);
      if (!property) continue;

      propertyStats.set(stat.propertyId, {
        property,
        monthlyRevenues: [],
        avgMonthlyRevenue: 0,
        totalRevenue: 0,
        totalBookings: 0,
        totalMinutes: 0,
        monthCount: 0,
      });
    }

    const ps = propertyStats.get(stat.propertyId)!;
    ps.monthlyRevenues.push(stat.totalRevenue);
    ps.totalRevenue += stat.totalRevenue;
    ps.totalBookings += stat.bookingCount;
    ps.totalMinutes += stat.totalMinutes;
    ps.monthCount += 1;
  }

  // 平均を計算
  for (const [, ps] of propertyStats) {
    if (ps.monthCount > 0) {
      ps.avgMonthlyRevenue = ps.totalRevenue / ps.monthCount;
    }
  }

  return { propertyStats, allProperties };
}

/**
 * 月別の季節指数を計算
 */
async function getSeasonalIndices(): Promise<Map<number, number>> {
  const monthlyTotals = await db
    .select({
      month: sql<number>`CAST(strftime('%m', ${bookings.usageDate}) AS INTEGER)`,
      total: sql<number>`COALESCE(SUM(${bookings.grossAmount}), 0)`,
    })
    .from(bookings)
    .where(eq(bookings.status, "confirmed"))
    .groupBy(sql`strftime('%m', ${bookings.usageDate})`);

  const avgMonthly =
    monthlyTotals.reduce((sum, m) => sum + m.total, 0) / Math.max(monthlyTotals.length, 1);

  const indices = new Map<number, number>();
  for (let m = 1; m <= 12; m++) {
    const monthData = monthlyTotals.find((mt) => mt.month === m);
    indices.set(m, monthData && avgMonthly > 0 ? monthData.total / avgMonthly : 1);
  }

  return indices;
}

/**
 * 類似度を計算（0-1）
 * Phase 4: 立地スコアを考慮した拡張版
 */
function calculateSimilarity(
  input: SimulationInput,
  property: { monthlyRent: number | null; roomCount: number | null }
): number {
  let similarity = 0;
  let totalWeight = 0;

  // 1. 賃料の類似度（重み: 0.35）
  if (property.monthlyRent && input.rent) {
    const rentRatio = Math.min(property.monthlyRent, input.rent) / Math.max(property.monthlyRent, input.rent);
    similarity += rentRatio * 0.35;
    totalWeight += 0.35;
  }

  // 2. 面積の類似度（重み: 0.25）
  if (input.areaTsubo && input.areaTsubo > 0) {
    // 現在は施設に面積データがないため、将来的に有効化
    // similarity += areaRatio * 0.25;
    // totalWeight += 0.25;
  }

  // 3. 立地スコアの類似度（重み: 0.25）[Phase 4追加]
  // 入力物件の立地スコアと、既存物件の平均立地スコア（仮定: 60）を比較
  if (input.locationScore !== undefined && input.locationScore !== null) {
    const avgPropertyLocationScore = 60; // 既存物件の平均スコア（仮定）
    const scoreDiff = Math.abs(input.locationScore - avgPropertyLocationScore);
    const scoreRatio = Math.max(0, 1 - scoreDiff / 100);
    similarity += scoreRatio * 0.25;
    totalWeight += 0.25;
  }

  // 4. 駅乗降客数の類似度（重み: 0.15）[Phase 4追加]
  if (input.stationPassengers !== undefined && input.stationPassengers !== null) {
    // 既存物件の平均乗降客数（仮定: 50,000人/日）
    const avgPropertyPassengers = 50000;
    const passengerRatio = Math.min(input.stationPassengers, avgPropertyPassengers) /
                          Math.max(input.stationPassengers, avgPropertyPassengers);
    similarity += passengerRatio * 0.15;
    totalWeight += 0.15;
  }

  // 基本類似度（データがない場合のフォールバック）
  if (totalWeight === 0) {
    return 0.5;
  }

  return similarity / totalWeight;
}

/**
 * 立地補正係数を計算
 * Phase 4: 立地スコアに基づいて売上予測を補正
 */
function getLocationAdjustmentFactor(locationScore: number | null): number {
  if (locationScore === null || locationScore === undefined) return 1.0;
  // スコア50で1.0、スコア100で1.3、スコア0で0.7
  return 1 + ((locationScore - 50) / 50) * 0.3;
}

/**
 * 売上シミュレーションを実行
 */
export async function runSimulation(input: SimulationInput): Promise<SimulationResult> {
  // 過去1年のデータを取得
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = oneYearAgo.toISOString().split("T")[0];

  const { propertyStats, allProperties } = await getPropertyStats(startDate);
  const seasonalIndices = await getSeasonalIndices();

  // 類似物件を特定
  const similarProperties: SimilarProperty[] = [];

  for (const [propertyId, stats] of propertyStats) {
    const similarity = calculateSimilarity(input, stats.property);

    // 稼働率を計算（営業時間12時間/日、30日/月と仮定）
    const availableMinutesPerMonth = 12 * 60 * 30;
    const avgMonthlyMinutes = stats.monthCount > 0 ? stats.totalMinutes / stats.monthCount : 0;
    const occupancyRate = Math.min(1, avgMonthlyMinutes / availableMinutesPerMonth);

    similarProperties.push({
      id: propertyId,
      name: stats.property.name,
      similarity,
      monthlyRevenue: stats.avgMonthlyRevenue,
      occupancyRate,
      areaTsubo: null, // 現在は面積データなし
      rent: stats.property.monthlyRent,
    });
  }

  // 類似度でソート
  similarProperties.sort((a, b) => b.similarity - a.similarity);

  // 売上予測を計算（類似物件の加重平均）
  let predictedRevenue = 0;
  let totalWeight = 0;

  for (const sp of similarProperties.slice(0, 5)) {
    const weight = sp.similarity;
    predictedRevenue += sp.monthlyRevenue * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    predictedRevenue = predictedRevenue / totalWeight;
  } else {
    // データがない場合のフォールバック（賃料の2倍を想定）
    predictedRevenue = input.rent * 2;
  }

  // 賃料に対する調整（賃料が高いと売上も高い傾向）
  const avgRent =
    allProperties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0) /
    Math.max(allProperties.filter((p) => p.monthlyRent).length, 1);

  if (avgRent > 0 && input.rent) {
    const rentFactor = input.rent / avgRent;
    predictedRevenue = predictedRevenue * Math.sqrt(rentFactor); // 緩やかな調整
  }

  // Phase 4: 立地スコアによる補正
  const locationFactor = getLocationAdjustmentFactor(input.locationScore ?? null);
  predictedRevenue = predictedRevenue * locationFactor;

  // 3シナリオを計算
  const scenarios = {
    pessimistic: createScenario(predictedRevenue * 0.6, input.rent),
    realistic: createScenario(predictedRevenue, input.rent),
    optimistic: createScenario(predictedRevenue * 1.5, input.rent),
  };

  // 損益分岐月数を計算（初期費用＝敷金・礼金2ヶ月分＋初期投資1ヶ月分と仮定）
  const initialCost = input.rent * 3;
  const monthlyProfit = scenarios.realistic.grossProfit;
  const breakEvenMonths = monthlyProfit > 0 ? Math.ceil(initialCost / monthlyProfit) : 999;

  // 月別予測
  const monthlyBreakdown: SimulationResult["monthlyBreakdown"] = [];
  for (let month = 1; month <= 12; month++) {
    const seasonalIndex = seasonalIndices.get(month) || 1;
    monthlyBreakdown.push({
      month,
      avgRevenue: Math.round(predictedRevenue * seasonalIndex),
      seasonalIndex: Math.round(seasonalIndex * 100) / 100,
    });
  }

  // インサイトを生成
  const insights = generateInsights(input, scenarios, similarProperties, breakEvenMonths);

  return {
    scenarios,
    similarProperties: similarProperties.slice(0, 5),
    breakEvenMonths,
    monthlyBreakdown,
    insights,
  };
}

/**
 * シナリオ結果を作成
 */
function createScenario(monthlyRevenue: number, rent: number): ScenarioResult {
  const revenue = Math.round(monthlyRevenue);
  const grossProfit = revenue - rent;
  const roi = rent > 0 ? Math.round((revenue / rent) * 100) / 100 : 0;

  // 稼働率は売上から推定（平均単価を仮定）
  const avgHourlyRate = 2000; // 想定時間単価
  const hoursPerMonth = 12 * 30; // 営業時間
  const maxRevenue = avgHourlyRate * hoursPerMonth;
  const occupancyRate = Math.min(1, Math.round((revenue / maxRevenue) * 100) / 100);

  return {
    monthlyRevenue: revenue,
    occupancyRate,
    roi,
    grossProfit,
  };
}

/**
 * インサイトを生成
 */
function generateInsights(
  input: SimulationInput,
  scenarios: SimulationResult["scenarios"],
  similarProperties: SimilarProperty[],
  breakEvenMonths: number
): string[] {
  const insights: string[] = [];

  // ROI評価
  if (scenarios.realistic.roi >= 2) {
    insights.push("収益性が高い物件です。積極的な検討をお勧めします。");
  } else if (scenarios.realistic.roi >= 1.5) {
    insights.push("標準的な収益性です。市場環境次第で良い投資になりえます。");
  } else if (scenarios.realistic.roi >= 1) {
    insights.push("収益性はやや低めです。慎重な検討が必要です。");
  } else {
    insights.push("現状の賃料では採算が取れない可能性があります。賃料交渉を検討してください。");
  }

  // 損益分岐点
  if (breakEvenMonths <= 6) {
    insights.push(`損益分岐点は${breakEvenMonths}ヶ月と早期です。`);
  } else if (breakEvenMonths <= 12) {
    insights.push(`損益分岐点は${breakEvenMonths}ヶ月です。1年以内の回収が見込めます。`);
  } else {
    insights.push(`損益分岐点は${breakEvenMonths}ヶ月と長めです。長期運用を前提にご検討ください。`);
  }

  // 類似物件との比較
  if (similarProperties.length > 0) {
    const topSimilar = similarProperties[0];
    if (topSimilar.similarity > 0.7) {
      insights.push(
        `「${topSimilar.name}」と類似性が高く（${Math.round(topSimilar.similarity * 100)}%）、参考になります。`
      );
    }
  }

  // 駅からの距離
  if (input.walkMinutes !== undefined && input.walkMinutes !== null) {
    if (input.walkMinutes <= 3) {
      insights.push("駅近物件のため、集客面で有利です。");
    } else if (input.walkMinutes >= 10) {
      insights.push("駅から距離があるため、価格設定やマーケティングに工夫が必要です。");
    }
  }

  // Phase 4: 立地スコアに基づくインサイト
  if (input.locationScore !== undefined && input.locationScore !== null) {
    if (input.locationScore >= 80) {
      insights.push("立地スコアが非常に高く（Aランク）、集客面で大きなアドバンテージがあります。");
    } else if (input.locationScore >= 60) {
      insights.push("立地スコアは良好（Bランク）です。標準以上の集客が期待できます。");
    } else if (input.locationScore >= 40) {
      insights.push("立地スコアは標準的（Cランク）です。競合との差別化を意識しましょう。");
    } else {
      insights.push("立地スコアが低め（D/Eランク）です。価格競争力やマーケティング強化が重要です。");
    }
  }

  // Phase 4: 駅乗降客数に基づくインサイト
  if (input.stationPassengers !== undefined && input.stationPassengers !== null) {
    if (input.stationPassengers >= 100000) {
      insights.push(
        `最寄駅の乗降客数が${(input.stationPassengers / 10000).toFixed(1)}万人/日と多く、高い露出が期待できます。`
      );
    } else if (input.stationPassengers >= 50000) {
      insights.push(
        `最寄駅は中規模ターミナル（${(input.stationPassengers / 10000).toFixed(1)}万人/日）で、安定した集客が見込めます。`
      );
    } else if (input.stationPassengers < 30000) {
      insights.push(
        `最寄駅の乗降客数が${(input.stationPassengers / 10000).toFixed(1)}万人/日と少なめです。Web集客の強化を検討してください。`
      );
    }
  }

  // Phase 4: 周辺法人数に基づくインサイト
  if (input.nearbyCompanies !== undefined && input.nearbyCompanies !== null) {
    if (input.nearbyCompanies >= 3000) {
      insights.push("周辺に法人が多く、ビジネス利用（会議室・セミナー）の需要が高いエリアです。");
    } else if (input.nearbyCompanies >= 1500) {
      insights.push("オフィスエリアとして一定の法人需要があります。");
    }
  }

  return insights;
}

/**
 * 既存施設の実績サマリーを取得
 */
export async function getPerformanceSummary() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = oneYearAgo.toISOString().split("T")[0];

  const { propertyStats } = await getPropertyStats(startDate);

  const summary = [];
  for (const [propertyId, stats] of propertyStats) {
    summary.push({
      propertyId,
      name: stats.property.name,
      avgMonthlyRevenue: Math.round(stats.avgMonthlyRevenue),
      totalRevenue: Math.round(stats.totalRevenue),
      rent: stats.property.monthlyRent,
      roi:
        stats.property.monthlyRent && stats.property.monthlyRent > 0
          ? Math.round((stats.avgMonthlyRevenue / stats.property.monthlyRent) * 100) / 100
          : null,
      monthCount: stats.monthCount,
    });
  }

  return summary.sort((a, b) => b.avgMonthlyRevenue - a.avgMonthlyRevenue);
}
