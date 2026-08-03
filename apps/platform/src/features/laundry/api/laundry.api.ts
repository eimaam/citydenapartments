import { api } from '../../../lib/api';
import type {
  LaundryCategoryResponse,
  LaundryItemResponse,
  LaundryBillResponse,
  LaundryStatusType,
} from '@citydenapartments/shared';

export interface LaundryCategorySummary extends LaundryCategoryResponse {
  itemCount: number;
}

export interface PaginatedItems {
  items: LaundryItemResponse[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PaginatedBills {
  items: LaundryBillResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateBillPayload {
  customerId?: string;
  walkIn?: { name: string; phone?: string };
  roomNumber?: string;
  lines: { itemId: string; service: 'laundry' | 'pressing'; qty: number }[];
  status?: LaundryStatusType;
  notes?: string;
}

export const laundryApi = {
  summary: () => api.get<LaundryCategorySummary[]>('/laundry/catalog?summary=true'),

  items: (params: { search?: string; category?: string; page: number; limit: number }) =>
    api.get<PaginatedItems>(
      `/laundry/catalog/items?${new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`,
    ),

  bills: (params: { page: number; limit: number; status?: string; search?: string; from?: string; to?: string }) =>
    api.get<PaginatedBills>(
      `/laundry/bills?${new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
      ).toString()}`,
    ),

  getBill: (id: string) => api.get<LaundryBillResponse>(`/laundry/bills/${id}`),

  createBill: (payload: CreateBillPayload) => api.post<LaundryBillResponse>('/laundry/bills', payload),

  updateStatus: (id: string, status: LaundryStatusType) =>
    api.patch<LaundryBillResponse>(`/laundry/bills/${id}/status`, { status }),
};
