import { api } from '../../../lib/api';

export interface RoomTypeResponse {
  _id: string;
  name: string;
  basePrice: number;
  minPriceAllowed: number;
  amenities: string[];
  isActive: boolean;
}

interface PaginatedRoomTypes {
  items: RoomTypeResponse[];
  total: number;
  page: number;
  limit: number;
}

export const roomTypesApi = {
  list: (branchId?: string) =>
    api.get<PaginatedRoomTypes>(`/room-types?limit=100${branchId ? `&branchId=${branchId}` : ''}`),
};
