import axios from 'axios';
import type {
  MenuCategoryResponse,
  MenuItemResponse,
  DeliveryLocationResponse,
  RestaurantBannerResponse,
  RestaurantOrderResponse,
} from '@citydenapartments/shared';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export const menuPublicApi = {
  getBranches: async (): Promise<Array<{ _id: string; name: string; code: string; address: string; city: string; state: string }>> => {
    const res = await client.get('/public/branches');
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  getCategories: async (branchId: string): Promise<MenuCategoryResponse[]> => {
    const res = await client.get('/public/restaurant-menu/categories', { params: { branchId } });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  getMenuItems: async (params: {
    branchId: string;
    categoryId?: string;
    search?: string;
    isChefSpecial?: boolean;
    tags?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: MenuItemResponse[]; total: number; totalPages: number }> => {
    const res = await client.get('/public/restaurant-menu/items', { params });
    const data = res.data?.data ?? res.data;
    if (data?.items && Array.isArray(data.items)) {
      return data;
    }
    if (Array.isArray(data)) {
      return { items: data, total: data.length, totalPages: 1 };
    }
    return { items: [], total: 0, totalPages: 0 };
  },

  getBanners: async (branchId?: string): Promise<RestaurantBannerResponse[]> => {
    const res = await client.get('/public/restaurant-menu/banners', { params: { branchId } });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  getDeliveryLocations: async (branchId: string): Promise<DeliveryLocationResponse[]> => {
    const res = await client.get('/public/restaurant-delivery/locations', { params: { branchId } });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },

  placeOrder: async (payload: any): Promise<RestaurantOrderResponse> => {
    const res = await client.post('/public/restaurant-orders', payload);
    return res.data?.data ?? res.data;
  },

  trackOrder: async (orderNumber: string): Promise<RestaurantOrderResponse> => {
    const res = await client.get(`/public/restaurant-orders/track/${encodeURIComponent(orderNumber)}`);
    return res.data?.data ?? res.data;
  },

  trackOrdersByPhone: async (phone: string): Promise<RestaurantOrderResponse[]> => {
    const res = await client.get('/public/restaurant-orders/track-phone', { params: { phone } });
    const data = res.data?.data ?? res.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  },
};
