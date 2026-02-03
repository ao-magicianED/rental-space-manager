/**
 * 位置情報インテリジェンスサービス
 * Phase 4: 駅乗降客数・周辺法人数・立地スコア計算
 */

import * as fs from "fs";
import * as path from "path";

// 駅データの型定義
interface StationData {
  name: string;
  prefecture: string;
  line: string;
  passengers: number;
}

interface StationInfo {
  name: string;
  passengers: number | null;
  line: string | null;
  prefecture: string | null;
  rank: number | null;
}

interface LocationFactors {
  stationPassengers: number | null;
  walkMinutes: number | null;
  nearbyCompanies: number | null;
}

// 駅データをキャッシュ
let stationCache: StationData[] | null = null;

/**
 * 駅データを読み込む
 */
function loadStationData(): StationData[] {
  if (stationCache) return stationCache;

  try {
    const dataPath = path.join(__dirname, "../data/station-data.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const parsed = JSON.parse(rawData);
    stationCache = parsed.stations as StationData[];
    return stationCache;
  } catch (error) {
    console.error("Failed to load station data:", error);
    return [];
  }
}

/**
 * 駅名を正規化（「駅」を除去、全角半角統一）
 */
function normalizeStationName(name: string): string {
  return name
    .replace(/駅$/, "")
    .replace(/ヶ/g, "ケ")
    .replace(/　/g, " ")
    .trim();
}

/**
 * 駅乗降客数情報を取得
 */
export async function getStationInfo(stationName: string): Promise<StationInfo> {
  const stations = loadStationData();
  const normalizedName = normalizeStationName(stationName);

  // 完全一致を優先
  let station = stations.find(
    (s) => normalizeStationName(s.name) === normalizedName
  );

  // 部分一致で検索
  if (!station) {
    station = stations.find(
      (s) =>
        normalizeStationName(s.name).includes(normalizedName) ||
        normalizedName.includes(normalizeStationName(s.name))
    );
  }

  if (!station) {
    return {
      name: stationName,
      passengers: null,
      line: null,
      prefecture: null,
      rank: null,
    };
  }

  // 順位を計算（乗降客数の降順）
  const sortedStations = [...stations].sort(
    (a, b) => b.passengers - a.passengers
  );
  const rank =
    sortedStations.findIndex((s) => s.name === station!.name) + 1;

  return {
    name: station.name,
    passengers: station.passengers,
    line: station.line,
    prefecture: station.prefecture,
    rank: rank || null,
  };
}

/**
 * 周辺法人数を推定（住所から概算）
 * 本来はgBizINFO APIを使用するが、ここでは簡易推定
 */
export async function getNearbyCompanies(address: string): Promise<number> {
  // 住所から区・市を抽出して概算
  const districtEstimates: Record<string, number> = {
    千代田区: 8500,
    中央区: 7200,
    港区: 6800,
    新宿区: 5500,
    渋谷区: 4800,
    文京区: 2800,
    豊島区: 3200,
    台東区: 2500,
    墨田区: 2000,
    江東区: 2800,
    品川区: 3500,
    目黒区: 2200,
    大田区: 2500,
    世田谷区: 2800,
    杉並区: 2000,
    中野区: 1800,
    練馬区: 1500,
    板橋区: 1800,
    北区: 1600,
    荒川区: 1200,
    足立区: 1500,
    葛飾区: 1200,
    江戸川区: 1400,
    横浜市: 3500,
    川崎市: 2800,
    さいたま市: 2200,
    千葉市: 1800,
  };

  for (const [district, count] of Object.entries(districtEstimates)) {
    if (address.includes(district)) {
      // ランダムな変動を加える（±20%）
      const variation = 0.8 + Math.random() * 0.4;
      return Math.round(count * variation);
    }
  }

  // デフォルト値（中規模エリア想定）
  return 1500;
}

/**
 * 駅乗降客数 → スコア変換（0-100）
 * 基準: 1万人以下=20, 5万人=50, 10万人=70, 30万人以上=100
 */
function calculatePassengerScore(passengers: number): number {
  if (passengers <= 10000) {
    return 20 + (passengers / 10000) * 20;
  }
  if (passengers <= 50000) {
    return 40 + ((passengers - 10000) / 40000) * 30;
  }
  if (passengers <= 100000) {
    return 70 + ((passengers - 50000) / 50000) * 20;
  }
  return Math.min(100, 90 + ((passengers - 100000) / 200000) * 10);
}

/**
 * 駅徒歩分数 → スコア変換（0-100）
 * 基準: 1分=100, 3分=90, 5分=80, 10分=50, 15分以上=20
 */
function calculateWalkScore(walkMinutes: number): number {
  if (walkMinutes <= 1) return 100;
  if (walkMinutes <= 3) return 100 - (walkMinutes - 1) * 5;
  if (walkMinutes <= 5) return 90 - (walkMinutes - 3) * 5;
  if (walkMinutes <= 10) return 80 - (walkMinutes - 5) * 6;
  return Math.max(20, 50 - (walkMinutes - 10) * 3);
}

/**
 * 周辺法人数 → スコア変換（0-100）
 * 基準: 100社以下=30, 500社=50, 1000社=70, 3000社以上=100
 */
function calculateCompanyScore(companies: number): number {
  if (companies <= 100) return 20 + (companies / 100) * 10;
  if (companies <= 500) return 30 + ((companies - 100) / 400) * 20;
  if (companies <= 1000) return 50 + ((companies - 500) / 500) * 20;
  return Math.min(100, 70 + ((companies - 1000) / 2000) * 30);
}

/**
 * 立地スコアを計算（0-100）
 * 重み: 駅乗降客数40%, 徒歩分数30%, 周辺法人数30%
 */
export function calculateLocationScore(factors: LocationFactors): number {
  let score = 0;
  let weights = 0;

  // 1. 駅乗降客数スコア（重み: 0.4）
  if (factors.stationPassengers !== null && factors.stationPassengers > 0) {
    const passengerScore = calculatePassengerScore(factors.stationPassengers);
    score += passengerScore * 0.4;
    weights += 0.4;
  }

  // 2. 駅徒歩分数スコア（重み: 0.3）
  if (factors.walkMinutes !== null && factors.walkMinutes > 0) {
    const walkScore = calculateWalkScore(factors.walkMinutes);
    score += walkScore * 0.3;
    weights += 0.3;
  }

  // 3. 周辺法人数スコア（重み: 0.3）
  if (factors.nearbyCompanies !== null && factors.nearbyCompanies > 0) {
    const companyScore = calculateCompanyScore(factors.nearbyCompanies);
    score += companyScore * 0.3;
    weights += 0.3;
  }

  // 重み付け正規化（データがある項目のみで計算）
  if (weights === 0) return 50; // デフォルト中央値
  return Math.round((score / weights) * 100);
}

/**
 * 立地スコアからランクを取得
 */
export function getLocationRank(score: number): string {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "E";
}

/**
 * 立地補正係数を計算
 * 基準スコア50に対して、±30%の補正
 */
export function getLocationMultiplier(locationScore: number | null): number {
  if (!locationScore) return 1.0;
  // スコア50で1.0、スコア100で1.3、スコア0で0.7
  return 1 + ((locationScore - 50) / 50) * 0.3;
}

/**
 * 立地分析の詳細レポートを生成
 */
export async function generateLocationAnalysis(
  stationName: string,
  walkMinutes: number | null,
  address: string | null
): Promise<{
  stationInfo: StationInfo;
  nearbyCompanies: number;
  locationScore: number;
  locationRank: string;
  locationMultiplier: number;
  insights: string[];
}> {
  const stationInfo = await getStationInfo(stationName);
  const nearbyCompanies = address
    ? await getNearbyCompanies(address)
    : 1500;

  const locationScore = calculateLocationScore({
    stationPassengers: stationInfo.passengers,
    walkMinutes,
    nearbyCompanies,
  });

  const locationRank = getLocationRank(locationScore);
  const locationMultiplier = getLocationMultiplier(locationScore);

  // インサイト生成
  const insights: string[] = [];

  if (stationInfo.passengers) {
    if (stationInfo.passengers >= 100000) {
      insights.push(
        `${stationInfo.name}駅は1日${(stationInfo.passengers / 10000).toFixed(1)}万人の乗降客数があり、高い集客力が期待できます。`
      );
    } else if (stationInfo.passengers >= 50000) {
      insights.push(
        `${stationInfo.name}駅は中規模ターミナルとして安定した集客が見込めます。`
      );
    } else if (stationInfo.passengers < 30000) {
      insights.push(
        `${stationInfo.name}駅の乗降客数は比較的少なめです。周辺施設やWebマーケティングでの集客強化を検討してください。`
      );
    }
  }

  if (walkMinutes !== null) {
    if (walkMinutes <= 3) {
      insights.push("駅から徒歩3分以内の好立地です。アクセスの良さをアピールポイントにできます。");
    } else if (walkMinutes <= 5) {
      insights.push("駅から徒歩5分圏内で、十分なアクセス利便性があります。");
    } else if (walkMinutes > 10) {
      insights.push(
        "駅から徒歩10分以上のため、バス利用者向けの案内や駐車場の有無が重要になります。"
      );
    }
  }

  if (nearbyCompanies >= 3000) {
    insights.push("周辺に法人が多く、ビジネス利用（会議室・セミナー）の需要が高いエリアです。");
  } else if (nearbyCompanies >= 1500) {
    insights.push("オフィスエリアとして一定の法人需要があります。");
  }

  if (locationRank === "A") {
    insights.push("総合的に非常に優れた立地です。競合との差別化よりも収益最大化に注力できます。");
  } else if (locationRank === "D" || locationRank === "E") {
    insights.push("立地条件は厳しめですが、価格競争力や独自のサービスで差別化を図ることが重要です。");
  }

  return {
    stationInfo,
    nearbyCompanies,
    locationScore,
    locationRank,
    locationMultiplier,
    insights,
  };
}
