import { api } from '../../../lib/api';
import type { RoomStatusType } from '@citydenapartments/shared';

export interface RoomResponse {
  _id: string;
  roomNumber: string;
  status: RoomStatusType;
  maxGuests: number;
  branchId: string;
  roomTypeId: {
    _id: string;
    name: string;
    amenities: string[];
  };
  isActive: boolean;
}

export interface PaginatedRooms {
  items: RoomResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface RoomsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const roomsApi = {
  list: (query: RoomsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    const qs = params.toString();
    return api.get<PaginatedRooms>(`/rooms${qs ? `?${qs}` : ''}`);
  },
  available: (checkIn: string, checkOut: string) =>
    api.get<RoomResponse[]>(`/rooms/available?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`),
  get: (id: string) => api.get<RoomResponse>(`/rooms/${id}`),
  updateStatus: (id: string, status: string) => api.patch<RoomResponse>(`/rooms/${id}/status`, { status }),
};
