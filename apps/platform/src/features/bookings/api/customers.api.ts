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

export const customersApi = {
  search: (phone: string) =>
    api.get<CustomerResponse[]>(`/customers/search?phone=${encodeURIComponent(phone)}`),
  get: (id: string) => api.get<CustomerResponse>(`/customers/${id}`),
};
