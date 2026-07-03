const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface PublicRoomType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  minPriceAllowed: number;
  amenities: string[];
  images: string[];
  branch: {
    id: string;
    name: string;
    code: string;
  };
}

export interface PublicRoom {
  id: string;
  roomNumber: string;
  maxGuests: number;
  images: string[];
}

interface RoomTypesResponse {
  items: PublicRoomType[];
}

interface RoomsResponse {
  items: PublicRoom[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getRoomTypes(branchCode?: string): Promise<PublicRoomType[]> {
  const params = branchCode ? `?branchCode=${branchCode}` : '';
  const data = await fetchJson<RoomTypesResponse>(`${BASE_URL}/public/room-types${params}`);
  return data.items;
}

export async function getRoomTypeRooms(roomTypeId: string): Promise<PublicRoom[]> {
  const data = await fetchJson<RoomsResponse>(`${BASE_URL}/public/room-types/${roomTypeId}/rooms`);
  return data.items;
}

export interface GalleryItem {
  url: string;
  key: string;
}

interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getGallery(page: number = 1, limit: number = 20): Promise<GalleryResponse> {
  return fetchJson<GalleryResponse>(`${BASE_URL}/public/gallery?page=${page}&limit=${limit}`);
}
