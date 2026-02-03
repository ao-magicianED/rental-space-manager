import { useState, useCallback } from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { api } from "../lib/api";
import type { Platform } from "../lib/api";

interface ParsedRow {
  platformPropertyName: string;
  usageDate: string;
  startTime?: string;
  endTime?: string;
  grossAmount: number;
  netAmount?: number;
  guestName?: string;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  errors: string[];
  warnings: string[];
}

export function Import() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // プラットフォーム一覧を取得
  useState(() => {
    api.getPlatforms().then(setPlatforms).catch(console.error);
  });

  // ファイル選択時の処理
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setError(null);
      setResult(null);

      try {
        const text = await readFileAsText(selectedFile);
        const { headers, rows } = parseCSV(text);
        setRawHeaders(headers);

        // プレビュー用にパース（最大10行）
        const previewRows = rows.slice(0, 10).map((row) => {
          return autoMapColumns(headers, row);
        });

        setPreview(previewRows);
      } catch (err) {
        setError(`ファイルの読み込みに失敗しました: ${err}`);
      }
    },
    []
  );

  // ドラッグ&ドロップ
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.name.endsWith(".csv")) {
        const input = document.createElement("input");
        input.type = "file";
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
        handleFileSelect({
          target: input,
        } as React.ChangeEvent<HTMLInputElement>);
      }
    },
    [handleFileSelect]
  );

  // インポート実行
  const handleImport = async () => {
    if (!file || !selectedPlatform) {
      setError("プラットフォームを選択してください");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const text = await readFileAsText(file);

      // サーバー側パーサーAPIを使用
      const response = await fetch(
        `/api/import/csv?platformCode=${selectedPlatform}&fileName=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
          body: text,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      setResult({
        success: true,
        totalRows: preview.length,
        importedRows: data.inserted,
        errors: data.unmapped?.map((name: string) => `未マッピング施設: ${name}`) || [],
        warnings: data.warnings || [],
      });

      // スキップや警告があれば表示
      if (data.skipped > 0) {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                warnings: [...prev.warnings, `${data.skipped}件の重複データをスキップしました`],
              }
            : prev
        );
      }
    } catch (err) {
      setError(`インポートエラー: ${err}`);
    } finally {
      setImporting(false);
    }
  };

  // リセット
  const handleReset = () => {
    setFile(null);
    setPreview([]);
    setRawHeaders([]);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                CSVインポート
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                各プラットフォームの売上データを取り込みます
              </p>
            </div>
            <a
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ダッシュボードに戻る
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* 左カラム: アップロード */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>1. CSVファイルを選択</CardTitle>
              </CardHeader>
              <CardContent>
                {/* プラットフォーム選択 */}
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    プラットフォーム
                  </label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    {platforms.map((pf) => (
                      <option key={pf.id} value={pf.code}>
                        {pf.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ドロップゾーン */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                    file
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileText className="mb-2 h-12 w-12 text-green-500" />
                      <p className="font-medium text-green-700">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="mt-2 text-sm text-red-600 hover:underline"
                      >
                        ファイルを変更
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="mb-2 h-12 w-12 text-gray-400" />
                      <p className="font-medium text-gray-700">
                        CSVファイルをドラッグ＆ドロップ
                      </p>
                      <p className="text-sm text-gray-500">
                        またはクリックしてファイルを選択
                      </p>
                    </div>
                  )}
                </div>

                {/* エラー表示 */}
                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 成功表示 */}
                {result?.success && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">インポート完了</span>
                      </div>
                      <p className="mt-2 text-sm text-green-600">
                        {result.importedRows} 件のデータを取り込みました
                      </p>
                    </div>
                    {result.warnings.length > 0 && (
                      <div className="rounded-lg bg-yellow-50 p-4">
                        <p className="font-medium text-yellow-700">警告</p>
                        <ul className="mt-2 space-y-1 text-sm text-yellow-600">
                          {result.warnings.map((w, i) => (
                            <li key={i}>• {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.errors.length > 0 && (
                      <div className="rounded-lg bg-red-50 p-4">
                        <p className="font-medium text-red-700">未マッピング施設</p>
                        <ul className="mt-2 space-y-1 text-sm text-red-600">
                          {result.errors.map((e, i) => (
                            <li key={i}>• {e}</li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-red-500">
                          設定ページでマッピングを追加してください
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* プレビュー */}
            {preview.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>2. プレビュー（最初の10行）</CardTitle>
                    <span className="text-sm text-gray-500">
                      検出カラム: {rawHeaders.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">
                            施設名
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">
                            利用日
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">
                            時間
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-gray-500">
                            売上
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">
                            ゲスト
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {preview.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">
                              {row.platformPropertyName || "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {row.usageDate || "-"}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {row.startTime && row.endTime
                                ? `${row.startTime}〜${row.endTime}`
                                : "-"}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-900">
                              ¥{row.grossAmount?.toLocaleString() || 0}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {row.guestName || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* インポートボタン */}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleImport}
                      disabled={importing || !selectedPlatform}
                      className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {importing ? "インポート中..." : "インポート実行"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右カラム: ヘルプ */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>対応フォーマット</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">自動検出カラム</h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• 施設名 / スペース名</li>
                    <li>• 利用日 / 予約日</li>
                    <li>• 開始時刻 / 終了時刻</li>
                    <li>• 売上 / 金額 / 料金</li>
                    <li>• 入金額 / 振込額</li>
                    <li>• ゲスト名 / 予約者名</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">日付形式</h4>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600">
                    <li>• 2024-01-15</li>
                    <li>• 2024/01/15</li>
                    <li>• 2024年1月15日</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">文字コード</h4>
                  <p className="mt-2 text-sm text-gray-600">
                    UTF-8 / Shift_JIS 両方に対応
                  </p>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>注意:</strong>{" "}
                    施設名のマッピングは後から設定できます。
                    まずはデータをインポートしてください。
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>インポート履歴</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  インポート履歴は「設定」ページで確認できます。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// ユーティリティ関数

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = reader.result as string;
      // Shift_JIS対応（BOMなしの場合の簡易判定）
      if (text.includes("�")) {
        // 文字化けしている場合はShift_JISとして再読み込み
        const reader2 = new FileReader();
        reader2.onload = () => resolve(reader2.result as string);
        reader2.onerror = reject;
        reader2.readAsText(file, "Shift_JIS");
      } else {
        resolve(text);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function autoMapColumns(headers: string[], row: string[]): ParsedRow {
  const getColumn = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const index = headers.findIndex((h) => pattern.test(h.toLowerCase()));
      if (index !== -1 && row[index]) {
        return row[index];
      }
    }
    return "";
  };

  const propertyName = getColumn([
    /施設/,
    /スペース/,
    /物件/,
    /店舗/,
    /room/,
    /space/,
  ]);

  const usageDate = normalizeDate(
    getColumn([/利用日/, /使用日/, /予約日/, /日付/, /date/])
  );

  const startTime = normalizeTime(getColumn([/開始/, /start/, /from/]));

  const endTime = normalizeTime(getColumn([/終了/, /end/, /to/]));

  const grossAmount = parseAmount(
    getColumn([/総額/, /売上/, /金額/, /料金/, /amount/, /price/, /total/])
  );

  const netAmount = parseAmount(getColumn([/入金/, /振込/, /net/, /payout/]));

  const guestName = getColumn([/名前/, /氏名/, /ゲスト/, /予約者/, /guest/, /name/]);

  return {
    platformPropertyName: propertyName,
    usageDate,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    grossAmount,
    netAmount: netAmount || undefined,
    guestName: guestName || undefined,
  };
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return "";

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // YYYY/MM/DD
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // 日本語形式
  const jpMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (jpMatch) {
    const [, y, m, d] = jpMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return dateStr;
}

function normalizeTime(timeStr: string): string {
  if (!timeStr) return "";
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return timeStr;
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[,、円¥\\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export default Import;
