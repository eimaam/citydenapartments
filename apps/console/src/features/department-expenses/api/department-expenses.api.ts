import { api } from '../../../lib/api';

export interface DepartmentExpenseEntry {
  _id: string;
  branchId: string;
  departmentId: { _id: string; name: string };
  amount: number;
  description: string;
  fromDate: string;
  toDate: string;
  loggedBy: { _id: string; name: string; email: string };
  updatedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseGroup {
  departmentId: string;
  departmentName: string;
  totalAmount: number;
  count: number;
}

export interface PaginatedExpenses {
  items: DepartmentExpenseEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateExpensePayload {
  departmentId: string;
  amount: number;
  description: string;
  fromDate: string;
  toDate: string;
}

export interface UpdateExpensePayload {
  departmentId?: string;
  amount?: number;
  description?: string;
  fromDate?: string;
  toDate?: string;
}

export const expensesApi = {
  list: (params: {
    departmentId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.departmentId) qs.set('departmentId', params.departmentId);
    if (params.fromDate) qs.set('fromDate', params.fromDate);
    if (params.toDate) qs.set('toDate', params.toDate);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return api.get<PaginatedExpenses>(`/department-expenses${s ? `?${s}` : ''}`);
  },
  getGroups: () => api.get<ExpenseGroup[]>('/department-expenses/groups'),
  get: (id: string) => api.get<DepartmentExpenseEntry>(`/department-expenses/${id}`),
  create: (data: CreateExpensePayload) => api.post<DepartmentExpenseEntry>('/department-expenses', data),
  update: (id: string, data: UpdateExpensePayload) => api.patch<DepartmentExpenseEntry>(`/department-expenses/${id}`, data),
};

export const revenueApi = {
  get: (params: { period?: string; fromDate?: string; toDate?: string }) => {
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
