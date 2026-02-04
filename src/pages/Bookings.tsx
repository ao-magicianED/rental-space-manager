import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { DateRangePicker } from "../components/DateRangePicker";
import { BookingForm } from "../components/bookings/BookingForm";
import { api } from "../lib/api";
import type { Booking, Property, Platform } from "../lib/api";

export function Bookings() {
  const today = new Date();
  const [startDate, setStartDate] = useState(
    format(startOfMonth(today), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(today), "yyyy-MM-dd")
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [filterPropertyId, setFilterPropertyId] = useState<number | null>(null);
  const [filterPlatformId, setFilterPlatformId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<"usageDate" | "grossAmount">("usageDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, propertiesData, platformsData] = await Promise.all([
        api.getBookings({
          startDate,
          endDate,
          propertyId: filterPropertyId || undefined,
          platformId: filterPlatformId || undefined,
        }),
        api.getProperties(),
        api.getPlatforms(),
      ]);
      setBookings(bookingsData);
      setProperties(propertiesData);
      setPlatforms(platformsData);
    } catch (e) {
      console.error("Error fetching data:", e);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, filterPropertyId, filterPlatformId]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleCreateBooking = async (data: Partial<Booking>) => {
    setFormLoading(true);
    try {
      await api.createBooking(data);
      setShowForm(false);
      await fetchData();
    } catch (e) {
      console.error("Error creating booking:", e);
      alert("予約の登録に失敗しました");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateBooking = async (data: Partial<Booking>) => {
    if (!editingBooking) return;
    setFormLoading(true);
    try {
      await api.updateBooking(editingBooking.id, data);
      setEditingBooking(null);
      await fetchData();
    } catch (e) {
      console.error("Error updating booking:", e);
      alert("予約の更新に失敗しました");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteBooking = async (id: number) => {
    try {
      await api.deleteBooking(id);
      setDeleteConfirm(null);
      await fetchData();
    } catch (e) {
      console.error("Error deleting booking:", e);
      alert("予約の削除に失敗しました");
    }
  };

  const getPropertyName = (id: number) =>
    properties.find((p) => p.id === id)?.name || "不明";

  const getPlatformName = (id: number) =>
    platforms.find((p) => p.id === id)?.name || "不明";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            確定
          </span>
        );
      case "pending":
        return (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            保留
          </span>
        );
      case "cancelled":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            キャンセル
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            {status}
          </span>
        );
    }
  };

  const filteredBookings = bookings
    .filter((booking) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        booking.guestName?.toLowerCase().includes(query) ||
        booking.platformBookingId?.toLowerCase().includes(query) ||
        getPropertyName(booking.propertyId).toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      const aVal = sortField === "usageDate" ? a.usageDate : a.grossAmount;
      const bVal = sortField === "usageDate" ? b.usageDate : b.grossAmount;
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const totalGross = filteredBookings.reduce((sum, b) => sum + b.grossAmount, 0);

  const toggleSort = (field: "usageDate" | "grossAmount") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  if (error) {
    return (
      <PageLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <CalendarCheck className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-lg font-medium text-slate-900">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
            >
              再試行
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="予約管理"
      description="予約の一覧・追加・編集"
      actions={
        <>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">新規予約</span>
            <span className="xs:hidden">追加</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg sm:rounded-xl bg-white border border-slate-200 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </>
      }
    >
      {loading && bookings.length === 0 ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto h-16 w-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 animate-ping opacity-20" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600">
                <RefreshCw className="h-8 w-8 animate-spin text-white" />
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-500">
              データを読み込んでいます...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 検索・フィルター */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ゲスト名、予約IDで検索..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                フィルター
                {showFilters ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    物件
                  </label>
                  <select
                    value={filterPropertyId || ""}
                    onChange={(e) =>
                      setFilterPropertyId(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">すべて</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    プラットフォーム
                  </label>
                  <select
                    value={filterPlatformId || ""}
                    onChange={(e) =>
                      setFilterPlatformId(
                        e.target.value ? parseInt(e.target.value) : null
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">すべて</option>
                    {platforms.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* サマリー */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
            <span className="text-sm font-medium">
              {filteredBookings.length}件の予約
            </span>
            <span className="text-sm font-bold">
              合計: ¥{totalGross.toLocaleString()}
            </span>
          </div>

          {/* 予約一覧 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* デスクトップテーブル */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSort("usageDate")}
                    >
                      <div className="flex items-center gap-1">
                        利用日
                        {sortField === "usageDate" && (
                          sortOrder === "desc" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3" />
                          )
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      物件
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      プラットフォーム
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      ゲスト
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleSort("grossAmount")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        売上
                        {sortField === "grossAmount" && (
                          sortOrder === "desc" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronUp className="h-3 w-3" />
                          )
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {booking.usageDate}
                        {booking.startTime && (
                          <span className="ml-2 text-slate-500">
                            {booking.startTime}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {getPropertyName(booking.propertyId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {getPlatformName(booking.platformId)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {booking.guestName || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">
                        ¥{booking.grossAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingBooking(booking)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                            title="編集"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(booking.id)}
                            className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイルカード */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-slate-900">
                        {booking.usageDate}
                        {booking.startTime && (
                          <span className="ml-2 text-slate-500 text-sm">
                            {booking.startTime}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {getPropertyName(booking.propertyId)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        ¥{booking.grossAmount.toLocaleString()}
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-slate-500">
                      {getPlatformName(booking.platformId)}
                      {booking.guestName && (
                        <span className="ml-2">/ {booking.guestName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingBooking(booking)}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(booking.id)}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredBookings.length === 0 && (
              <div className="p-12 text-center">
                <CalendarCheck className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-sm text-slate-500">
                  予約データがありません
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  新規予約を追加
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 新規作成フォーム */}
      {showForm && (
        <BookingForm
          properties={properties}
          platforms={platforms}
          onSubmit={handleCreateBooking}
          onCancel={() => setShowForm(false)}
          loading={formLoading}
        />
      )}

      {/* 編集フォーム */}
      {editingBooking && (
        <BookingForm
          booking={editingBooking}
          properties={properties}
          platforms={platforms}
          onSubmit={handleUpdateBooking}
          onCancel={() => setEditingBooking(null)}
          loading={formLoading}
        />
      )}

      {/* 削除確認ダイアログ */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              予約を削除しますか？
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDeleteBooking(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export default Bookings;
