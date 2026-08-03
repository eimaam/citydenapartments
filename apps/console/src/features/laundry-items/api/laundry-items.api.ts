import { api } from '../../../lib/api';
import type { LaundryCategoryResponse, LaundryItemResponse } from '@citydenapartments/shared';

export interface LaundryCatalogCategory extends LaundryCategoryResponse {
  items: LaundryItemResponse[];
}

export const laundryItemsApi = {
  catalog: () => api.get<LaundryCatalogCategory[]>('/laundry/catalog'),

  createItem: (payload: { category: string; item: string; laundryPrice: number; pressingPrice?: number | null }) =>
    api.post<LaundryItemResponse>('/laundry/catalog', payload),

  updateItem: (id: string, payload: Partial<{ category: string; item: string; laundryPrice: number; pressingPrice: number | null }>) =>
    api.patch<LaundryItemResponse>(`/laundry/catalog/${id}`, payload),

  deleteItem: (id: string) => api.delete<{ message: string }>(`/laundry/catalog/${id}`),

  renameCategory: (id: string, name: string) => api.patch<LaundryCategoryResponse>(`/laundry/categories/${id}`, { name }),

  deleteCategory: (id: string) => api.delete<{ message: string }>(`/laundry/categories/${id}`),
};
