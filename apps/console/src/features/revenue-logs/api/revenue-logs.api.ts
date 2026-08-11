import { api } from '../../../lib/api';
import type { RevenueLogResponse, RevenueLogSummaryResponse } from '@citydenapartments/shared';

export interface CreateRevenueLogPayload {
  departmentId: string;
  revenueDate: string;
  cashAmount?: number;
  posAmount?: number;
  transferAmount?: number;
  otherAmount?: number;
  notes?: string;
}

export interface RevenueLogsListResponse {
  items: RevenueLogResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const revenueLogsApi = {
  create: (payload: CreateRevenueLogPayload) =>
    api.post<RevenueLogResponse>('/revenue-logs', payload),

  list: (query: { departmentId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (query.departmentId) params.set('departmentId', query.departmentId);
    if (query.fromDate) params.set('fromDate', query.fromDate);
    if (query.toDate) params.set('toDate', query.toDate);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return api.get<RevenueLogsListResponse>(`/revenue-logs${qs ? `?${qs}` : ''}`);
  },

  summary: (query: { fromDate?: string; toDate?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.fromDate) params.set('fromDate', query.fromDate);
    if (query.toDate) params.set('toDate', query.toDate);
    const qs = params.toString();
    return api.get<RevenueLogSummaryResponse>(`/revenue-logs/summary${qs ? `?${qs}` : ''}`);
  },

  getById: (id: string) =>
    api.get<RevenueLogResponse>(`/revenue-logs/${id}`),

  delete: (id: string) =>
    api.delete<{ success: boolean }>(`/revenue-logs/${id}`),
};
