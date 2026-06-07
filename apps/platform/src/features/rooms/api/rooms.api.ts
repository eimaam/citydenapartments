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
    basePrice: number;
    minPriceAllowed: number;
    amenities: string[];
  };
  isActive: boolean;
}

export const roomsApi = {
  list: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return api.get<RoomResponse[]>(`/rooms${params}`);
  },
  get: (id: string) => api.get<RoomResponse>(`/rooms/${id}`),
};
