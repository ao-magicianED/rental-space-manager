/**
 * マイソクOCRサービス
 * Claude Vision APIを使用して不動産物件概要書（マイソク）から情報を抽出
 */

import Anthropic from "@anthropic-ai/sdk";

// 抽出されたマイソク情報の型定義
export interface MaisokuData {
  propertyName: string | null;
  address: string | null;
  areaTsubo: number | null;
  areaSqm: number | null;
  rent: number | null;
  managementFee: number | null;
  deposit: number | null;
  keyMoney: number | null;
  layout: string | null;
  floor: string | null;
  buildingAge: number | null;
  structure: string | null;
  nearestStation: string | null;
  railwayLine: string | null;
  walkMinutes: number | null;
}

export interface OcrResult {
  success: boolean;
  data: MaisokuData | null;
  confidence: number;
  rawText: string | null;
  error: string | null;
}

// Claude APIクライアント（環境変数から取得）
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
};

// マイソク解析プロンプト
const MAISOKU_PROMPT = `あなたは不動産物件概要書（マイソク）の読み取りエキスパートです。
以下の画像から不動産物件情報を抽出してください。

必ず以下のJSON形式で回答してください。値が読み取れない場合はnullを入れてください。

{
  "propertyName": "物件名（例：○○マンション301号室）",
  "address": "住所（例：東京都文京区本駒込1-2-3）",
  "areaTsubo": 坪数（数値のみ、例：12.5）,
  "areaSqm": 平米数（数値のみ、例：41.32）,
  "rent": 月額賃料（数値のみ、円単位、例：85000）,
  "managementFee": 共益費・管理費（数値のみ、円単位、例：5000）,
  "deposit": 敷金（月数、例：1）,
  "keyMoney": 礼金（月数、例：1）,
  "layout": "間取り（例：1LDK、ワンルーム）",
  "floor": "階数（例：3階/5階建）",
  "buildingAge": 築年数（数値のみ、例：15）,
  "structure": "構造（例：RC造、SRC造、木造）",
  "nearestStation": "最寄駅名（例：駒込）",
  "railwayLine": "路線名（例：JR山手線）",
  "walkMinutes": 徒歩分数（数値のみ、例：5）
}

注意事項:
- 金額は全て円単位の数値に変換してください（万円表記は×10000）
- 面積は坪と平米の両方を抽出してください（片方しかない場合は計算: 1坪≒3.3㎡）
- 築年数は「築15年」→15、「2010年築」→現在年-2010 で計算
- 読み取れない項目はnullにしてください
- JSON以外の文字は出力しないでください`;

/**
 * マイソク画像からテキスト情報を抽出
 * @param imageBase64 Base64エンコードされた画像データ
 * @param mediaType 画像のMIMEタイプ
 */
export async function extractMaisokuData(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg"
): Promise<OcrResult> {
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: MAISOKU_PROMPT,
            },
          ],
        },
      ],
    });

    // レスポンスからテキストを抽出
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        success: false,
        data: null,
        confidence: 0,
        rawText: null,
        error: "No text response from API",
      };
    }

    const rawText = textContent.text;

    // JSONをパース
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        data: null,
        confidence: 0,
        rawText,
        error: "Could not find JSON in response",
      };
    }

    const data = JSON.parse(jsonMatch[0]) as MaisokuData;

    // 信頼度を計算（入力されたフィールド数に基づく）
    const fields = Object.values(data);
    const filledFields = fields.filter((v) => v !== null).length;
    const confidence = filledFields / fields.length;

    return {
      success: true,
      data,
      confidence,
      rawText,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      confidence: 0,
      rawText: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 坪単価・平米単価を計算
 */
export function calculatePricePerUnit(
  rent: number | null,
  areaTsubo: number | null,
  areaSqm: number | null
): { pricePerTsubo: number | null; pricePerSqm: number | null } {
  let pricePerTsubo: number | null = null;
  let pricePerSqm: number | null = null;

  if (rent) {
    if (areaTsubo && areaTsubo > 0) {
      pricePerTsubo = Math.round(rent / areaTsubo);
    }
    if (areaSqm && areaSqm > 0) {
      pricePerSqm = Math.round(rent / areaSqm);
    }
    // 片方しかない場合は変換して計算
    if (!pricePerTsubo && pricePerSqm) {
      pricePerTsubo = Math.round(pricePerSqm * 3.30579);
    }
    if (!pricePerSqm && pricePerTsubo) {
      pricePerSqm = Math.round(pricePerTsubo / 3.30579);
    }
  }

  return { pricePerTsubo, pricePerSqm };
}
