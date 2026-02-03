import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Upload,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  Train,
  DollarSign,
  BarChart3,
  RefreshCw,
  X,
  Check,
  Eye,
  Calculator,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const API_BASE = "http://localhost:5001";

interface PropertyProspect {
  id: number;
  name: string;
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
  pricePerTsubo: number | null;
  pricePerSqm: number | null;
  estimatedRevenue: number | null;
  estimatedOccupancy: number | null;
  estimatedROI: number | null;
  breakEvenMonths: number | null;
  stationPassengers: number | null;
  nearbyCompanies: number | null;
  locationScore: number | null;
  sourceImage: string | null;
  ocrConfidence: number | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

type StatusFilter = "all" | "draft" | "evaluating" | "approved" | "rejected";

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-700" },
  evaluating: { label: "評価中", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "承認", color: "bg-green-100 text-green-700" },
  rejected: { label: "却下", color: "bg-red-100 text-red-700" },
};

export function PropertyProspects() {
  const [prospects, setProspects] = useState<PropertyProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Partial<PropertyProspect> | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_BASE}/api/property-prospects${params}`);
      if (res.ok) {
        const data = await res.json();
        setProspects(data);
      }
    } catch (error) {
      console.error("Failed to fetch prospects:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `¥${value.toLocaleString()}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrResult(null);

    try {
      // ファイルをBase64に変換
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

        const res = await fetch(`${API_BASE}/api/property-prospects/ocr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        });

        if (res.ok) {
          const result = await res.json();
          setOcrResult(result);
          setEditingProspect({
            name: result.extracted.propertyName || "新規物件",
            ...result.extracted,
          });
        } else {
          const error = await res.json();
          alert(`OCR解析に失敗しました: ${error.error}`);
        }
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("OCR error:", error);
      setOcrLoading(false);
    }
  };

  const handleSaveProspect = async () => {
    if (!editingProspect?.name) {
      alert("物件名は必須です");
      return;
    }

    try {
      const method = editingProspect.id ? "PUT" : "POST";
      const url = editingProspect.id
        ? `${API_BASE}/api/property-prospects/${editingProspect.id}`
        : `${API_BASE}/api/property-prospects`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProspect),
      });

      if (res.ok) {
        setShowEditModal(false);
        setShowUploadModal(false);
        setEditingProspect(null);
        setOcrResult(null);
        fetchProspects();
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この物件候補を削除しますか？")) return;

    try {
      const res = await fetch(`${API_BASE}/api/property-prospects/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProspects();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/property-prospects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchProspects();
      }
    } catch (error) {
      console.error("Status change error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              物件投資分析
            </h1>
            <p className="text-sm text-gray-500">マイソクOCR解析・坪単価計算・シミュレーション</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowUploadModal(true);
                setEditingProspect({ name: "", status: "draft" });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" />
              マイソク解析
            </button>
            <button
              onClick={() => {
                setShowEditModal(true);
                setEditingProspect({ name: "", status: "draft" });
              }}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              手動追加
            </button>
            <a href="/" className="text-sm text-blue-600 hover:underline">
              ダッシュボードに戻る
            </a>
          </div>
        </div>
      </header>

      {/* フィルター */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">ステータス:</span>
          {(["all", "draft", "evaluating", "approved", "rejected"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-sm rounded-full ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "すべて" : statusLabels[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : prospects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">物件候補がありません</p>
              <p className="text-sm text-gray-400 mt-1">
                「マイソク解析」または「手動追加」で物件を登録してください
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg shadow text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">物件名</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">最寄駅</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">面積</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">賃料</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">坪単価</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">平米単価</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">予測売上</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">予測ROI</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">ステータス</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.address && (
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {p.address}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.nearestStation ? (
                        <div className="flex items-center gap-1">
                          <Train className="w-3 h-3 text-gray-400" />
                          <span>{p.nearestStation}</span>
                          {p.walkMinutes && (
                            <span className="text-xs text-gray-400">徒歩{p.walkMinutes}分</span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.areaTsubo ? `${p.areaTsubo}坪` : p.areaSqm ? `${p.areaSqm}㎡` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(p.rent)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {formatCurrency(p.pricePerTsubo)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(p.pricePerSqm)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.estimatedRevenue ? (
                        <span className="text-green-600 font-medium">
                          {formatCurrency(p.estimatedRevenue)}
                        </span>
                      ) : (
                        <button
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          onClick={() => {
                            setEditingProspect(p);
                            setShowEditModal(true);
                          }}
                        >
                          <Calculator className="w-3 h-3" />
                          計算
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.estimatedROI ? (
                        <span
                          className={`font-medium ${
                            p.estimatedROI >= 1 ? "text-green-600" : "text-orange-600"
                          }`}
                        >
                          {p.estimatedROI.toFixed(1)}倍
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${
                          statusLabels[p.status]?.color || "bg-gray-100"
                        }`}
                      >
                        {statusLabels[p.status]?.label || p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingProspect(p);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="編集"
                        >
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </button>
                        {p.status === "draft" && (
                          <button
                            onClick={() => handleStatusChange(p.id, "evaluating")}
                            className="p-1.5 hover:bg-yellow-100 rounded"
                            title="評価開始"
                          >
                            <Eye className="w-4 h-4 text-yellow-600" />
                          </button>
                        )}
                        {p.status === "evaluating" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(p.id, "approved")}
                              className="p-1.5 hover:bg-green-100 rounded"
                              title="承認"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(p.id, "rejected")}
                              className="p-1.5 hover:bg-red-100 rounded"
                              title="却下"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 hover:bg-red-100 rounded"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* サマリーカード */}
        {prospects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">登録物件数</p>
                    <p className="text-2xl font-bold">{prospects.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">平均賃料</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        Math.round(
                          prospects.filter((p) => p.rent).reduce((a, p) => a + (p.rent || 0), 0) /
                            prospects.filter((p) => p.rent).length || 0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-500">平均坪単価</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        Math.round(
                          prospects.filter((p) => p.pricePerTsubo).reduce((a, p) => a + (p.pricePerTsubo || 0), 0) /
                            prospects.filter((p) => p.pricePerTsubo).length || 0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">承認済み</p>
                    <p className="text-2xl font-bold">
                      {prospects.filter((p) => p.status === "approved").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* マイソクアップロードモーダル */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">マイソクOCR解析</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setOcrResult(null);
                  setEditingProspect(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* アップロードエリア */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                {ocrLoading ? (
                  <div className="flex flex-col items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                    <p className="text-gray-600">OCR解析中...</p>
                    <p className="text-xs text-gray-400">Claude Vision APIで画像を解析しています</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-600 mb-2">マイソク画像をアップロード</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="maisoku-upload"
                    />
                    <label
                      htmlFor="maisoku-upload"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                    >
                      ファイルを選択
                    </label>
                    <p className="text-xs text-gray-400 mt-2">
                      対応形式: JPEG, PNG, GIF, WebP
                    </p>
                  </>
                )}
              </div>

              {/* OCR結果プレビュー */}
              {ocrResult && editingProspect && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">抽出結果</h3>
                    <span className="text-sm text-gray-500">
                      信頼度: {(ocrResult.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-gray-500">物件名</label>
                      <input
                        type="text"
                        value={editingProspect.name || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, name: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">住所</label>
                      <input
                        type="text"
                        value={editingProspect.address || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, address: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">賃料（円）</label>
                      <input
                        type="number"
                        value={editingProspect.rent || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            rent: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">面積（坪）</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingProspect.areaTsubo || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            areaTsubo: parseFloat(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">最寄駅</label>
                      <input
                        type="text"
                        value={editingProspect.nearestStation || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, nearestStation: e.target.value })
                        }
                        className="w-full border rounded px-2 py-1 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">徒歩（分）</label>
                      <input
                        type="number"
                        value={editingProspect.walkMinutes || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            walkMinutes: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-2 py-1 mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setOcrResult(null);
                        setEditingProspect(null);
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveProspect}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      保存
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && editingProspect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingProspect.id ? "物件編集" : "物件追加"}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingProspect(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="col-span-2">
                  <label className="text-gray-500">物件名 *</label>
                  <input
                    type="text"
                    value={editingProspect.name || ""}
                    onChange={(e) =>
                      setEditingProspect({ ...editingProspect, name: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-500">ステータス</label>
                  <select
                    value={editingProspect.status || "draft"}
                    onChange={(e) =>
                      setEditingProspect({ ...editingProspect, status: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 mt-1"
                  >
                    <option value="draft">下書き</option>
                    <option value="evaluating">評価中</option>
                    <option value="approved">承認</option>
                    <option value="rejected">却下</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-gray-500">住所</label>
                  <input
                    type="text"
                    value={editingProspect.address || ""}
                    onChange={(e) =>
                      setEditingProspect({ ...editingProspect, address: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 mt-1"
                  />
                </div>

                <div className="col-span-3 border-t pt-4 mt-2">
                  <h3 className="font-medium mb-3">賃料・面積</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-gray-500">賃料（円）</label>
                      <input
                        type="number"
                        value={editingProspect.rent || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            rent: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">共益費（円）</label>
                      <input
                        type="number"
                        value={editingProspect.managementFee || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            managementFee: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">敷金（ヶ月）</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingProspect.deposit || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            deposit: parseFloat(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">礼金（ヶ月）</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingProspect.keyMoney || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            keyMoney: parseFloat(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">面積（坪）</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingProspect.areaTsubo || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            areaTsubo: parseFloat(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">面積（㎡）</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingProspect.areaSqm || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            areaSqm: parseFloat(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">間取り</label>
                      <input
                        type="text"
                        value={editingProspect.layout || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, layout: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">階数</label>
                      <input
                        type="text"
                        value={editingProspect.floor || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, floor: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-3 border-t pt-4 mt-2">
                  <h3 className="font-medium mb-3">物件情報</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-gray-500">構造</label>
                      <input
                        type="text"
                        value={editingProspect.structure || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, structure: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">築年数</label>
                      <input
                        type="number"
                        value={editingProspect.buildingAge || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            buildingAge: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">最寄駅</label>
                      <input
                        type="text"
                        value={editingProspect.nearestStation || ""}
                        onChange={(e) =>
                          setEditingProspect({ ...editingProspect, nearestStation: e.target.value })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500">徒歩（分）</label>
                      <input
                        type="number"
                        value={editingProspect.walkMinutes || ""}
                        onChange={(e) =>
                          setEditingProspect({
                            ...editingProspect,
                            walkMinutes: parseInt(e.target.value) || null,
                          })
                        }
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-3 border-t pt-4 mt-2">
                  <label className="text-gray-500">メモ</label>
                  <textarea
                    value={editingProspect.notes || ""}
                    onChange={(e) =>
                      setEditingProspect({ ...editingProspect, notes: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2 mt-1"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingProspect(null);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveProspect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyProspects;
