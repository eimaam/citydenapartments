import { api } from '../../../lib/api';

export interface DashboardSummary {
  overview: {
    totalRevenue: number;
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
  breakfast: {
    total: number;
    served: number;
    pending: number;
  };
  branch: { id: string; name: string; code: string } | null;
}

export interface AccountingSummary {
  revenue: {
    total: number;
    byPaymentMethod: {
      cash: number;
      pos_card: number;
      bank_transfer: number;
    };
    today: number;
    thisMonth: number;
    averagePerBooking: number;
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
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
  accounting: () => api.get<AccountingSummary>('/dashboard/accounting'),
  revenue: (params: { period?: string; fromDate?: string; toDate?: string }) => {
    const qs = new URLSearchParams();
    if (params.period) qs.set('period', params.period);
    if (params.fromDate) qs.set('fromDate', params.fromDate);
    if (params.toDate) qs.set('toDate', params.toDate);
    const s = qs.toString();
    return api.get<{
      period: { from: string; to: string; label: string | null };
      bookingRevenue: number;
      bookingCount: number;
      departmentExpenses: number;
      expenseCount: number;
      totalRevenue: number;
      vatCollected: number;
      serviceChargeCollected: number;
      vatCount: number;
      scCount: number;
    }>(`/dashboard/revenue${s ? `?${s}` : ''}`);
  },
};
