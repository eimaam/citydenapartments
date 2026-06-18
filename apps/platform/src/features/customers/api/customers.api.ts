import { api } from '../../../lib/api';

export interface CustomerResponse {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  nationality: string;
  dob?: string;
  phone2?: string;
  comingFrom: string;
  stateOfOrigin: string;
  occupation: string;
  nextDestination: string;
  gender: string;
  religion?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: string;
  createdAt: string;
}

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
};
