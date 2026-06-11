import { api } from '../../../lib/api';

export interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  isActive: boolean;
}

export interface InventoryTransaction {
  _id: string;
  itemId: { _id: string; name: string; category: string; unit: string };
  type: 'restock' | 'issue' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  requestedBy?: string;
  department?: string;
  notes?: string;
  createdAt: string;
}

export interface PaginatedItems {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  items: InventoryTransaction[];
  total: number;
  page: number;
  limit: number;
}

export const inventoryApi = {
  listItems: (params: { page?: number; limit?: number; search?: string; category?: string; lowStock?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    if (params.lowStock) qs.set('lowStock', params.lowStock);
    return api.get<PaginatedItems>(`/inventory/items?${qs}`);
  },
  getItem: (id: string) => api.get<InventoryItem>(`/inventory/items/${id}`),
  createItem: (data: { name: string; category: string; description?: string; unit: string; currentStock: number; reorderLevel: number }) =>
    api.post<InventoryItem>('/inventory/items', data),
  updateItem: (id: string, data: { name?: string; category?: string; description?: string; unit?: string; reorderLevel?: number; isActive?: boolean }) =>
    api.patch<InventoryItem>(`/inventory/items/${id}`, data),
  restock: (id: string, data: { quantity: number; notes?: string }) =>
    api.post<InventoryItem>(`/inventory/items/${id}/restock`, data),
  issue: (id: string, data: { quantity: number; requestedBy?: string; department?: string; notes?: string }) =>
    api.post<InventoryItem>(`/inventory/items/${id}/issue`, data),
  listTransactions: (params: { page?: number; limit?: number; itemId?: string; type?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.itemId) qs.set('itemId', params.itemId);
    if (params.type) qs.set('type', params.type);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return api.get<PaginatedTransactions>(`/inventory/transactions?${qs}`);
  },
};
