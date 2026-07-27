import { api } from '../../../lib/api';
import type { CustomerResponse } from '@citydenapartments/shared';
export type { CustomerResponse };

export const customersApi = {
  search: (phone: string) =>
    api.get<CustomerResponse[]>(`/customers/search?phone=${encodeURIComponent(phone)}`),
  get: (id: string) => api.get<CustomerResponse>(`/customers/${id}`),
};
