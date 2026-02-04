// 開発環境ではプロキシ経由、本番環境では直接アクセス
const API_BASE = import.meta.env.DEV && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : "/api";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

// 型定義
export interface Platform {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  commissionRate: number;
  createdAt: string;
}

export interface Property {
  id: number;
  code: string;
  name: string;
  address: string | null;
  monthlyRent: number;
  monthlyFixedCost: number;
  roomCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformMapping {
  id: number;
  propertyId: number;
  platformId: number;
  platformPropertyName: string;
  platformPropertyId?: string;
  isActive: boolean;
}

export interface Booking {
  id: number;
  propertyId: number;
  roomId: number | null;
  platformId: number;
  bookingDate: string;
  usageDate: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  grossAmount: number;
  netAmount: number | null;
  commission: number | null;
  platformBookingId: string | null;
  guestName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalGross: number;
  totalNet: number;
  bookingCount: number;
  totalExpense: number;
  grossProfit: number;
  salesByProperty: { propertyId: number; totalGross: number; bookingCount: number }[];
  salesByPlatform: { platformId: number; totalGross: number; bookingCount: number }[];
}

export interface DailySales {
  date: string;
  totalGross: number;
  bookingCount: number;
}

// 比較分析
export interface YearOverYearComparison {
  current: {
    period: { start: string; end: string };
    totalGross: number;
    totalNet: number;
    bookingCount: number;
    avgAmount: number;
    totalDuration: number;
  };
  previous: {
    period: { start: string; end: string };
    totalGross: number;
    totalNet: number;
    bookingCount: number;
    avgAmount: number;
    totalDuration: number;
  };
  changes: {
    revenue: number;
    bookings: number;
    avgAmount: number;
    revenueAbsolute: number;
    bookingsAbsolute: number;
  };
  monthlyTrends: Array<{
    year: number;
    month: number;
    totalGross: number;
    bookingCount: number;
  }>;
  propertyComparison: Array<{
    propertyId: number;
    year: number;
    totalGross: number;
    bookingCount: number;
  }>;
}

export interface MonthlyTrend {
  yearMonth: string;
  year: number;
  month: number;
  totalGross: number;
  totalNet: number;
  bookingCount: number;
  avgAmount: number;
  previousYearGross: number | null;
  previousYearBookings: number | null;
  yoyChange: number | null;
}

// API関数
export const api = {
  // プラットフォーム
  getPlatforms: () => fetchApi<Platform[]>("/platforms"),

  // 施設
  getProperties: () => fetchApi<Property[]>("/properties"),
  createProperty: (data: Partial<Property>) =>
    fetchApi<Property>("/properties", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProperty: (id: number, data: Partial<Property>) =>
    fetchApi<Property>(`/properties/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // マッピング
  getMappings: () => fetchApi<PlatformMapping[]>("/mappings"),
  createMapping: (data: Partial<PlatformMapping>) =>
    fetchApi<PlatformMapping>("/mappings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMapping: (id: number, data: Partial<PlatformMapping>) =>
    fetchApi<PlatformMapping>(`/mappings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // 予約
  getBookings: (params?: {
    startDate?: string;
    endDate?: string;
    propertyId?: number;
    platformId?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.propertyId)
      searchParams.set("propertyId", params.propertyId.toString());
    if (params?.platformId)
      searchParams.set("platformId", params.platformId.toString());
    return fetchApi<Booking[]>(`/bookings?${searchParams.toString()}`);
  },
  createBooking: (data: Partial<Booking>) =>
    fetchApi<Booking>("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateBooking: (id: number, data: Partial<Booking>) =>
    fetchApi<Booking>(`/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteBooking: (id: number) =>
    fetchApi<{ success: boolean }>(`/bookings/${id}`, {
      method: "DELETE",
    }),

  // ダッシュボード
  getDashboardSummary: (params?: { startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    return fetchApi<DashboardSummary>(
      `/dashboard/summary?${searchParams.toString()}`
    );
  },

  getDailySales: (params?: { startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    return fetchApi<DailySales[]>(
      `/dashboard/daily-sales?${searchParams.toString()}`
    );
  },

  // 比較分析
  getYearOverYearComparison: (params: { startDate: string; endDate: string }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("startDate", params.startDate);
    searchParams.set("endDate", params.endDate);
    return fetchApi<YearOverYearComparison>(
      `/analytics/comparison/year-over-year?${searchParams.toString()}`
    );
  },

  getMonthlyTrends: (params?: { months?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.months) searchParams.set("months", params.months.toString());
    return fetchApi<{ data: MonthlyTrend[]; summary: { totalMonths: number; avgMonthlyRevenue: number; avgMonthlyBookings: number } }>(
      `/analytics/monthly-trends?${searchParams.toString()}`
    );
  },
};

export default api;
