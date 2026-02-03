import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Save,
  X,
  Link,
  AlertCircle,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { api } from "../lib/api";
import type { Platform, Property, PlatformMapping } from "../lib/api";

export function Settings() {
  const [activeTab, setActiveTab] = useState<"properties" | "mappings">(
    "properties"
  );
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [mappings, setMappings] = useState<PlatformMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 施設編集用
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newProperty, setNewProperty] = useState(false);

  // マッピング編集用
  const [editingMapping, setEditingMapping] = useState<PlatformMapping | null>(
    null
  );
  const [newMapping, setNewMapping] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const [pfs, props] = await Promise.all([
        api.getPlatforms(),
        api.getProperties(),
      ]);
      setPlatforms(pfs);
      setProperties(props);
      // マッピングは施設がある場合のみ取得
      if (props.length > 0) {
        try {
          const maps = await api.getMappings();
          setMappings(maps);
        } catch {
          setMappings([]);
        }
      }
      setError(null);
    } catch (e) {
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 施設の保存
  const handleSaveProperty = async (property: Partial<Property>) => {
    try {
      if (property.id) {
        await api.updateProperty(property.id, property);
      } else {
        await api.createProperty(property);
      }
      setEditingProperty(null);
      setNewProperty(false);
      fetchData();
    } catch (e) {
      setError("施設の保存に失敗しました");
    }
  };

  // マッピングの保存
  const handleSaveMapping = async (mapping: Partial<PlatformMapping>) => {
    try {
      await api.createMapping(mapping);
      setEditingMapping(null);
      setNewMapping(false);
      fetchData();
    } catch (e) {
      setError("マッピングの保存に失敗しました");
    }
  };

  return (
    <PageLayout
      title="設定"
      description="施設とプラットフォームのマッピングを管理"
    >
      {/* タブ */}
      <div className="mb-6 -mt-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("properties")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "properties"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Building2 className="h-4 w-4" />
            施設管理
          </button>
          <button
            onClick={() => setActiveTab("mappings")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === "mappings"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Link className="h-4 w-4" />
            施設名マッピング
          </button>
        </div>
      </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* 施設管理タブ */}
            {activeTab === "properties" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">施設一覧</h2>
                  <button
                    onClick={() => {
                      setNewProperty(true);
                      setEditingProperty({
                        id: 0,
                        code: "",
                        name: "",
                        address: "",
                        monthlyRent: 0,
                        monthlyFixedCost: 0,
                        roomCount: 1,
                        isActive: true,
                        createdAt: "",
                        updatedAt: "",
                      });
                    }}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    施設を追加
                  </button>
                </div>

                {/* 施設一覧テーブル */}
                <Card>
                  <CardContent className="p-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            コード
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            施設名
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            住所
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                            月額家賃
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                            固定費
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">
                            部屋数
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {properties.map((property) => (
                          <tr key={property.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {property.code}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {property.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {property.address || "-"}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">
                              ¥{property.monthlyRent.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">
                              ¥{property.monthlyFixedCost.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center text-sm text-gray-900">
                              {property.roomCount}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => setEditingProperty(property)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {properties.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-12 text-center text-gray-500"
                            >
                              施設がありません。「施設を追加」から登録してください。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* マッピングタブ */}
            {activeTab === "mappings" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">施設名マッピング</h2>
                    <p className="text-sm text-gray-500">
                      各プラットフォームの施設名をマスタ施設に紐付けます
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNewMapping(true);
                      setEditingMapping({
                        id: 0,
                        propertyId: properties[0]?.id || 0,
                        platformId: platforms[0]?.id || 0,
                        platformPropertyName: "",
                        isActive: true,
                      });
                    }}
                    disabled={properties.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    マッピングを追加
                  </button>
                </div>

                {properties.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        まず施設を登録してください
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        マッピングを作成するには、先に施設を登録する必要があります。
                      </p>
                      <button
                        onClick={() => setActiveTab("properties")}
                        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        施設管理へ
                      </button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {platforms
                      .filter((pf) => pf.isActive)
                      .map((platform) => {
                        const platformMappings = mappings.filter(
                          (m) => m.platformId === platform.id
                        );
                        return (
                          <Card key={platform.id}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <span>{platform.name}</span>
                                <span className="text-sm font-normal text-gray-500">
                                  手数料 {(platform.commissionRate * 100).toFixed(0)}%
                                </span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {platformMappings.length > 0 ? (
                                <ul className="space-y-2">
                                  {platformMappings.map((mapping) => {
                                    const property = properties.find(
                                      (p) => p.id === mapping.propertyId
                                    );
                                    return (
                                      <li
                                        key={mapping.id}
                                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                                      >
                                        <div>
                                          <span className="font-medium text-gray-900">
                                            {mapping.platformPropertyName}
                                          </span>
                                          <span className="mx-2 text-gray-400">
                                            →
                                          </span>
                                          <span className="text-blue-600">
                                            {property?.name || "未設定"}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() =>
                                            setEditingMapping(mapping)
                                          }
                                          className="text-gray-400 hover:text-gray-600"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  マッピングがありません
                                </p>
                              )}
                              <button
                                onClick={() => {
                                  setNewMapping(true);
                                  setEditingMapping({
                                    id: 0,
                                    propertyId: properties[0]?.id || 0,
                                    platformId: platform.id,
                                    platformPropertyName: "",
                                    isActive: true,
                                  });
                                }}
                                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                <Plus className="h-3 w-3" />
                                追加
                              </button>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 施設編集モーダル */}
        {(editingProperty || newProperty) && (
          <PropertyModal
            property={editingProperty!}
            onSave={handleSaveProperty}
            onClose={() => {
              setEditingProperty(null);
              setNewProperty(false);
            }}
            isNew={newProperty}
          />
        )}

        {/* マッピング編集モーダル */}
        {(editingMapping || newMapping) && (
          <MappingModal
            mapping={editingMapping!}
            platforms={platforms}
            properties={properties}
            onSave={handleSaveMapping}
            onClose={() => {
              setEditingMapping(null);
              setNewMapping(false);
            }}
            isNew={newMapping}
          />
        )}
    </PageLayout>
  );
}

// 施設編集モーダル
function PropertyModal({
  property,
  onSave,
  onClose,
  isNew,
}: {
  property: Property;
  onSave: (property: Partial<Property>) => void;
  onClose: () => void;
  isNew: boolean;
}) {
  const [form, setForm] = useState({
    code: property.code || "",
    name: property.name || "",
    address: property.address || "",
    monthlyRent: property.monthlyRent || 0,
    monthlyFixedCost: property.monthlyFixedCost || 0,
    roomCount: property.roomCount || 1,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      id: isNew ? undefined : property.id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isNew ? "施設を追加" : "施設を編集"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                施設コード
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="P001"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                部屋数
              </label>
              <input
                type="number"
                value={form.roomCount}
                onChange={(e) =>
                  setForm({ ...form, roomCount: parseInt(e.target.value) || 1 })
                }
                min="1"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              施設名
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="渋谷スペースA"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              住所
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="東京都渋谷区..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                月額家賃（円）
              </label>
              <input
                type="number"
                value={form.monthlyRent}
                onChange={(e) =>
                  setForm({ ...form, monthlyRent: parseInt(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                月額固定費（円）
              </label>
              <input
                type="number"
                value={form.monthlyFixedCost}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monthlyFixedCost: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// マッピング編集モーダル
function MappingModal({
  mapping,
  platforms,
  properties,
  onSave,
  onClose,
  isNew,
}: {
  mapping: PlatformMapping;
  platforms: Platform[];
  properties: Property[];
  onSave: (mapping: Partial<PlatformMapping>) => void;
  onClose: () => void;
  isNew: boolean;
}) {
  const [form, setForm] = useState({
    platformId: mapping.platformId,
    propertyId: mapping.propertyId,
    platformPropertyName: mapping.platformPropertyName || "",
    platformPropertyId: mapping.platformPropertyId || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      id: isNew ? undefined : mapping.id,
      isActive: true,
    });
  };

  const selectedPlatform = platforms.find((p) => p.id === form.platformId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isNew ? "マッピングを追加" : "マッピングを編集"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              プラットフォーム
            </label>
            <select
              value={form.platformId}
              onChange={(e) =>
                setForm({ ...form, platformId: parseInt(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              {platforms.map((pf) => (
                <option key={pf.id} value={pf.id}>
                  {pf.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {selectedPlatform?.name || "プラットフォーム"}上の施設名
            </label>
            <input
              type="text"
              value={form.platformPropertyName}
              onChange={(e) =>
                setForm({ ...form, platformPropertyName: e.target.value })
              }
              placeholder="インスタベースに登録されている施設名"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              CSVに記載されている施設名と完全一致させてください
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              紐付け先の施設（マスタ）
            </label>
            <select
              value={form.propertyId}
              onChange={(e) =>
                setForm({ ...form, propertyId: parseInt(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.code} - {prop.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              プラットフォーム上のID（任意）
            </label>
            <input
              type="text"
              value={form.platformPropertyId}
              onChange={(e) =>
                setForm({ ...form, platformPropertyId: e.target.value })
              }
              placeholder="12345"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
