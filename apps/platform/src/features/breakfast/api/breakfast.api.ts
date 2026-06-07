import { api } from '../../../lib/api';

export interface ManifestEntry {
  bookingId: string;
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

export const breakfastApi = {
  manifest: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return api.get<ManifestEntry[]>(`/breakfast/manifest${params}`);
  },
  serve: (data: ServePayload) => api.post<void>('/breakfast/serve', data),
};
