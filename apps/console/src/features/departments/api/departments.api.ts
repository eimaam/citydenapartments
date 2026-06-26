import { api } from '../../../lib/api';

export interface Department {
  _id: string;
  name: string;
  description?: string;
  branchId: string;
  isDeleted: boolean;
  createdBy: { _id: string; name: string } | string;
  createdAt: string;
}

export const departmentsApi = {
  list: (branchId: string, includeDeleted = false) =>
    api.get<Department[]>(`/departments?branchId=${branchId}&includeDeleted=${includeDeleted}`),

  get: (id: string) =>
    api.get<Department>(`/departments/${id}`),

  create: (data: { name: string; description?: string; branchId: string }) =>
    api.post<Department>('/departments', data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<Department>(`/departments/${id}`, data),

  remove: (id: string) =>
    api.delete<Department>(`/departments/${id}`),
};
