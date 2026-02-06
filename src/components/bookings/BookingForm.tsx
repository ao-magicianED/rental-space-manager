import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Booking, Property, Platform } from "../../lib/api";

interface BookingFormProps {
  booking?: Booking | null;
  properties: Property[];
  platforms: Platform[];
  onSubmit: (data: Partial<Booking>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function BookingForm({
  booking,
  properties,
  platforms,
  onSubmit,
  onCancel,
  loading = false,
}: BookingFormProps) {
  const [formData, setFormData] = useState({
    propertyId: booking?.propertyId || (properties[0]?.id || 0),
    platformId: booking?.platformId || (platforms[0]?.id || 0),
    bookingDate: booking?.bookingDate || new Date().toISOString().split("T")[0],
    usageDate: booking?.usageDate || new Date().toISOString().split("T")[0],
    startTime: booking?.startTime || "",
    endTime: booking?.endTime || "",
    grossAmount: booking?.grossAmount || 0,
    netAmount: booking?.netAmount || 0,
    commission: booking?.commission || 0,
    guestName: booking?.guestName || "",
    platformBookingId: booking?.platformBookingId || "",
    status: booking?.status || "confirmed",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (booking) {
      setFormData({
        propertyId: booking.propertyId,
        platformId: booking.platformId,
        bookingDate: booking.bookingDate,
        usageDate: booking.usageDate,
        startTime: booking.startTime || "",
        endTime: booking.endTime || "",
        grossAmount: booking.grossAmount,
        netAmount: booking.netAmount || 0,
        commission: booking.commission || 0,
        guestName: booking.guestName || "",
        platformBookingId: booking.platformBookingId || "",
        status: booking.status,
      });
    }
  }, [booking]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const calculateCommission = () => {
    const platform = platforms.find((p) => p.id === formData.platformId);
    if (platform && formData.grossAmount > 0) {
      const commission = Math.round(
        formData.grossAmount * (platform.commissionRate / 100)
      );
      const netAmount = formData.grossAmount - commission;
      setFormData((prev) => ({ ...prev, commission, netAmount }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.propertyId) newErrors.propertyId = "物件を選択してください";
    if (!formData.platformId)
      newErrors.platformId = "プラットフォームを選択してください";
    if (!formData.usageDate) newErrors.usageDate = "利用日を入力してください";
    if (formData.grossAmount <= 0)
      newErrors.grossAmount = "売上金額を入力してください";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      ...formData,
      startTime: formData.startTime || null,
      endTime: formData.endTime || null,
      netAmount: formData.netAmount || null,
      commission: formData.commission || null,
      guestName: formData.guestName || null,
      platformBookingId: formData.platformBookingId || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {booking ? "予約を編集" : "新規予約"}
          </h2>
          <button
            onClick={onCancel}
            className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                物件 <span className="text-red-500">*</span>
              </label>
              <select
                name="propertyId"
                value={formData.propertyId}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.propertyId ? "border-red-500" : "border-slate-300"
                } px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <option value="">選択してください</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              {errors.propertyId && (
                <p className="mt-1 text-xs text-red-500">{errors.propertyId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                プラットフォーム <span className="text-red-500">*</span>
              </label>
              <select
                name="platformId"
                value={formData.platformId}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.platformId ? "border-red-500" : "border-slate-300"
                } px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <option value="">選択してください</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
              {errors.platformId && (
                <p className="mt-1 text-xs text-red-500">{errors.platformId}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                予約日
              </label>
              <input
                type="date"
                name="bookingDate"
                value={formData.bookingDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                利用日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="usageDate"
                value={formData.usageDate}
                onChange={handleChange}
                className={`w-full rounded-lg border ${
                  errors.usageDate ? "border-red-500" : "border-slate-300"
                } px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
              {errors.usageDate && (
                <p className="mt-1 text-xs text-red-500">{errors.usageDate}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                開始時間
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                終了時間
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              売上金額（税込） <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                name="grossAmount"
                value={formData.grossAmount}
                onChange={handleChange}
                onBlur={calculateCommission}
                inputMode="numeric"
                className={`flex-1 rounded-lg border ${
                  errors.grossAmount ? "border-red-500" : "border-slate-300"
                } px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                min="0"
              />
              <button
                type="button"
                onClick={calculateCommission}
                className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors whitespace-nowrap"
              >
                手数料計算
              </button>
            </div>
            {errors.grossAmount && (
              <p className="mt-1 text-xs text-red-500">{errors.grossAmount}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                手数料
              </label>
              <input
                type="number"
                name="commission"
                value={formData.commission}
                onChange={handleChange}
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ネット金額
              </label>
              <input
                type="number"
                name="netAmount"
                value={formData.netAmount}
                onChange={handleChange}
                inputMode="numeric"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                min="0"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ゲスト名
              </label>
              <input
                type="text"
                name="guestName"
                value={formData.guestName}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="例: 山田太郎"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                プラットフォーム予約ID
              </label>
              <input
                type="text"
                name="platformBookingId"
                value={formData.platformBookingId}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="例: BK12345"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ステータス
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="confirmed">確定</option>
              <option value="pending">保留</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-4 py-3 sm:py-2.5 text-base sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 sm:py-2.5 text-base sm:text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50"
            >
              {loading ? "保存中..." : booking ? "更新" : "登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingForm;
