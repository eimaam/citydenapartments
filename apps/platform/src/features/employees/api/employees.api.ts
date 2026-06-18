import { api } from '../../../lib/api';

export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  position?: string;
  branchId: string;
  isActive: boolean;
}

export const employeesApi = {
  search: (q: string) =>
    api.get<Employee[]>(`/employees/search?q=${encodeURIComponent(q)}`),
};
