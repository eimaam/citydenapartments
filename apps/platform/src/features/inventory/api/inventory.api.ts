import { api } from '../../../lib/api';

export interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  costPrice?: number;
  expiryDate?: string;
  isActive: boolean;
}

export interface InventoryTransaction {
  _id: string;
  itemId: { _id: string; name: string; category: string; unit: string };
  type: 'restock' | 'issue' | 'adjustment' | 'spoilage' | 'disposal';
  quantity: number;
  previousStock: number;
  newStock: number;
  requestedBy?: string;
  department?: string;
  notes?: string;
  createdAt: string;
}

export interface DailySnapshotResponse {
  _id: string;
  itemId: { _id: string; name: string; category: string; unit: string } | string;
  date: string;
  openingStock: number;
  closingStock: number;
  totalRestocks: number;
  totalIssues: number;
  totalAdjustments: number;
  totalSpoilage: number;
  branchId: string;
  autoClosed: boolean;
}

export interface SpoilageReportResponse {
  _id: string;
  itemId: { _id: string; name: string; category: string; unit: string; currentStock: number };
  branchId: string;
  quantity: number;
  spoilageType: 'expired' | 'damaged' | 'contaminated' | 'stolen' | 'lost' | 'other';
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reportedBy: { _id: string; name: string; email: string };
  reportedAt: string;
  respondedBy?: { _id: string; name: string; email: string };
  respondedAt?: string;
  statusHistory: Array<{
    fromStatus: string;
    toStatus: string;
    changedBy: { _id: string; name: string; email: string };
    changedAt: string;
  }>;
}

export interface PaginatedSnapshots {
  items: DailySnapshotResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginatedSpoilage {
  items: SpoilageReportResponse[];
  total: number;
  page: number;
  limit: number;
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
  createItem: (data: { name: string; category: string; description?: string; unit: string; currentStock: number; reorderLevel: number; costPrice?: number; expiryDate?: string }) =>
    api.post<InventoryItem>('/inventory/items', data),
  updateItem: (id: string, data: { name?: string; category?: string; description?: string; unit?: string; reorderLevel?: number; costPrice?: number; expiryDate?: string; isActive?: boolean }) =>
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
  reportSpoilage: (id: string, data: { quantity: number; spoilageType: string; reason: string; notes?: string }) =>
    api.post<SpoilageReportResponse>(`/inventory/items/${id}/spoilage`, data),
  listSpoilage: (params: { page?: number; limit?: number; status?: string; from?: string; to?: string; itemId?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.itemId) qs.set('itemId', params.itemId);
    return api.get<PaginatedSpoilage>(`/inventory/spoilage?${qs}`);
  },
  getSpoilage: (id: string) => api.get<SpoilageReportResponse>(`/inventory/spoilage/${id}`),
  approveSpoilage: (id: string) => api.patch<SpoilageReportResponse>(`/inventory/spoilage/${id}/approve`),
  rejectSpoilage: (id: string) => api.patch<SpoilageReportResponse>(`/inventory/spoilage/${id}/reject`),
  listSnapshots: (params: { page?: number; limit?: number; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return api.get<PaginatedSnapshots>(`/inventory/snapshots?${qs}`);
  },
};
