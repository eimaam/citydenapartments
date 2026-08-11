import { api } from '../../../lib/api';

export interface DashboardSummary {
  period?: { from: string | null; to: string | null; label: string };
  overview: {
    totalRevenue: number;
    bookingRevenue?: number;
    departmentRevenue?: number;
    occupancyRate: number;
    roomCounts: {
      total: number;
      available: number;
      occupied: number;
      dirty: number;
      maintenance: number;
    };
    totalBookings: number;
    checkedInGuests: number;
    pendingCheckIns: number;
    todayArrivals: number;
  };
  departmentRevenueBreakdown?: {
    total: number;
    cash: number;
    pos: number;
    transfer: number;
    other: number;
    count: number;
  };
  breakfast: {
    total: number;
    served: number;
    pending: number;
  };
  branch: { id: string; name: string; code: string } | null;
}

export interface AccountingSummary {
  period?: { from: string | null; to: string | null; label: string };
  revenue: {
    total: number;
    roomBookingRevenue?: number;
    byPaymentMethod: {
      cash: number;
      pos_card: number;
      bank_transfer: number;
      other?: number;
    };
    today: number;
    thisMonth: number;
    averagePerBooking: number;
    departmentRevenue?: {
      total: number;
      cash: number;
      pos: number;
      transfer: number;
      other: number;
      count: number;
    };
    combinedGrossRevenue?: number;
  };
  discounts: {
    totalGiven: number;
    averagePercentage: number;
    totalBookingsWithDiscount: number;
    thisMonth: {
      totalGiven: number;
      averagePercentage: number;
      bookingsWithDiscount: number;
    };
  };
  bookings: {
    total: number;
    reserved: number;
    confirmed: number;
    checked_in: number;
    checked_out: number;
    cancelled: number;
  };
  inventory: {
    totalItems: number;
    totalValue: number;
    expiringItems: number;
  };
  dailyRevenue: {
    date: string;
    revenue: number;
    count: number;
  }[];
}

export const dashboardApi = {
  summary: (params: { period?: string; fromDate?: string; toDate?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set('period', params.period);
    if (params.fromDate) qs.set('fromDate', params.fromDate);
    if (params.toDate) qs.set('toDate', params.toDate);
    const s = qs.toString();
    return api.get<DashboardSummary>(`/dashboard/summary${s ? `?${s}` : ''}`);
  },
  accounting: (params: { period?: string; fromDate?: string; toDate?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set('period', params.period);
    if (params.fromDate) qs.set('fromDate', params.fromDate);
    if (params.toDate) qs.set('toDate', params.toDate);
    const s = qs.toString();
    return api.get<AccountingSummary>(`/dashboard/accounting${s ? `?${s}` : ''}`);
  },
  revenue: (params: { period?: string; fromDate?: string; toDate?: string }) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set('period', params.period);
    if (params.fromDate) qs.set('fromDate', params.fromDate);
    if (params.toDate) qs.set('toDate', params.toDate);
    const s = qs.toString();
    return api.get<{
      period: { from: string | null; to: string | null; label: string };
      bookingRevenue: number;
      bookingCount: number;
      departmentRevenue: number;
      departmentRevenueCount: number;
      departmentRevenueBreakdown: { cash: number; pos: number; transfer: number; other: number };
      departmentExpenses: number;
      expenseCount: number;
      grossRevenue: number;
      netRevenue: number;
      totalRevenue: number;
      vatCollected: number;
      serviceChargeCollected: number;
      vatCount: number;
      scCount: number;
    }>(`/dashboard/revenue${s ? `?${s}` : ''}`);
  },
};
