import { api } from '../../../lib/api';
import type {
  ExpenseHeadResponse,
  CreateExpenseHeadPayload,
  UpdateExpenseHeadPayload,
  ExpenseHeadGroupSummary,
  ExpenseHeadTypeType,
} from '@citydenapartments/shared';

export const expenseHeadsApi = {
  list: (params?: { type?: ExpenseHeadTypeType; branchId?: string; includeInactive?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.branchId) qs.set('branchId', params.branchId);
    if (params?.includeInactive) qs.set('includeInactive', 'true');
    const s = qs.toString();
    return api.get<ExpenseHeadResponse[]>(`/expense-heads${s ? `?${s}` : ''}`);
  },
  getSummary: (branchId?: string) => {
    const qs = new URLSearchParams();
    if (branchId) qs.set('branchId', branchId);
    const s = qs.toString();
    return api.get<ExpenseHeadGroupSummary>(`/expense-heads/summary${s ? `?${s}` : ''}`);
  },
  get: (id: string) => api.get<ExpenseHeadResponse>(`/expense-heads/${id}`),
  create: (data: CreateExpenseHeadPayload) => api.post<ExpenseHeadResponse>('/expense-heads', data),
  update: (id: string, data: UpdateExpenseHeadPayload) => api.patch<ExpenseHeadResponse>(`/expense-heads/${id}`, data),
  toggleActive: (id: string) => api.patch<ExpenseHeadResponse>(`/expense-heads/${id}/toggle`, {}),
};
