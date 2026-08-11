import { api } from '../../../lib/api';
import type { CustomerResponse, CustomerTimelineResponse } from '@citydenapartments/shared';
export type { CustomerResponse, CustomerTimelineResponse };

export interface PaginatedCustomers {
  items: CustomerResponse[];
  total: number;
  page: number;
  limit: number;
}

export const customersApi = {
  list: (params: { page?: number; limit?: number; search?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    return api.get<PaginatedCustomers>(`/customers?${qs.toString()}`);
  },
  search: (phone: string) =>
    api.get<CustomerResponse[]>(`/customers/search?phone=${encodeURIComponent(phone)}`),
  get: (id: string) => api.get<CustomerResponse>(`/customers/${id}`),
  getTimeline: (id: string, params?: { startDate?: string; endDate?: string; eventType?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    if (params?.eventType) qs.set('eventType', params.eventType);
    return api.get<CustomerTimelineResponse>(`/customers/${id}/timeline?${qs.toString()}`);
  },
  create: (data: any) => api.post<CustomerResponse>('/customers', data),
  updateBranchDiscount: (id: string, data: { branchId: string; percentage: number; reason?: string }) =>
    api.patch<CustomerResponse>(`/customers/${id}/branch-discounts`, data),
  getWalletLogs: (id: string) => api.get<any[]>(`/customers/${id}/wallet-logs`),
  creditWallet: (id: string, data: { branchId: string; amount: number; reason: string }) =>
    api.post<{ walletBalance: number }>(`/customers/${id}/credit-wallet`, data),
};
