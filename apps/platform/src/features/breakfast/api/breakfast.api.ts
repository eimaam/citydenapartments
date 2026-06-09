import { api } from '../../../lib/api';

export interface ManifestEntry {
  bookingId: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  isServed: boolean;
  servedAt: string | null;
}

export interface ServePayload {
  bookingId: string;
  roomId: string;
  guestName: string;
  dateServed: string;
  servingsClaimed?: number;
}

export interface PaginatedManifest {
  items: ManifestEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface ManifestQuery {
  page?: number;
  limit?: number;
  search?: string;
  date?: string;
}

export const breakfastApi = {
  manifest: (query: ManifestQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.search) params.set('search', query.search);
    if (query.date) params.set('date', query.date);
    const qs = params.toString();
    return api.get<PaginatedManifest>(`/breakfast/manifest${qs ? `?${qs}` : ''}`);
  },
  serve: (data: ServePayload) => api.post<void>('/breakfast/serve', data),
};
