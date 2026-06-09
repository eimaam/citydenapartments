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

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
};
