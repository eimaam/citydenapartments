import { api } from '../../../lib/api';

export interface DiscountCode {
  _id: string;
  code: string;
  percentage: number;
  usedCount: number;
  // [multi-use] uncomment to restore maxUsage
  // maxUsage?: number;
  isActive: boolean;
  expiresAt?: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface PaginatedDiscountCodes {
  items: DiscountCode[];
  total: number;
  page: number;
  limit: number;
}

export const discountCodesApi = {
  list: (params: { page?: number; limit?: number; isActive?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.isActive) qs.set('isActive', params.isActive);
    if (params.search) qs.set('search', params.search);
    return api.get<PaginatedDiscountCodes>(`/discount-codes?${qs}`);
  },
  get: (id: string) => api.get<DiscountCode>(`/discount-codes/${id}`),
  generate: (data: { percentage: number; expiresAt?: string }) =>
    api.post<DiscountCode>('/discount-codes', data),
  validate: (code: string) => api.post<{ _id: string; code: string; percentage: number }>('/discount-codes/validate', { code }),
  toggleActive: (id: string) => api.patch<DiscountCode>(`/discount-codes/${id}/toggle`),
};
