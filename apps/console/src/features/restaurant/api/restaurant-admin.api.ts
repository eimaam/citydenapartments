import { api } from '../../../lib/api';
import axios from 'axios';
import type {
  MenuCategoryResponse,
  MenuItemResponse,
  DeliveryLocationResponse,
  RestaurantBannerResponse,
} from '@citydenapartments/shared';

export interface RestaurantAnalyticsResponse {
  overall: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    inRoomOrders: number;
    homeDeliveryOrders: number;
  };
  topItems: Array<{
    _id: string;
    totalQuantity: number;
    totalSales: number;
  }>;
  statusCounts: Record<string, number>;
}

export const restaurantAdminApi = {
  // ── Upload Image to R2 ──────────────────────────────────────────
  uploadImage: async (file: File): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('token');
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/restaurant-menu/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      },
    );
    return res.data?.data || res.data;
  },

  // ── Categories ──────────────────────────────────────────────────
  getCategories: async (branchId?: string): Promise<MenuCategoryResponse[]> => {
    return api.get<MenuCategoryResponse[]>('/restaurant-menu/categories', { params: { branchId } });
  },

  createCategory: async (data: { name: string; description?: string; icon?: string; sortOrder?: number; branchId?: string }): Promise<MenuCategoryResponse> => {
    return api.post<MenuCategoryResponse>('/restaurant-menu/categories', data);
  },

  updateCategory: async (id: string, data: any): Promise<MenuCategoryResponse> => {
    return api.patch<MenuCategoryResponse>(`/restaurant-menu/categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/restaurant-menu/categories/${id}`);
  },

  // ── Menu Items ──────────────────────────────────────────────────
  getMenuItems: async (params?: {
    branchId?: string;
    categoryId?: string;
    search?: string;
    isAvailable?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: MenuItemResponse[]; total: number; page: number; limit: number; totalPages: number }> => {
    return api.get('/restaurant-menu/items', { params });
  },

  getMenuItemById: async (id: string): Promise<MenuItemResponse> => {
    return api.get<MenuItemResponse>(`/restaurant-menu/items/${id}`);
  },

  createMenuItem: async (data: any): Promise<MenuItemResponse> => {
    return api.post<MenuItemResponse>('/restaurant-menu/items', data);
  },

  updateMenuItem: async (id: string, data: any): Promise<MenuItemResponse> => {
    return api.patch<MenuItemResponse>(`/restaurant-menu/items/${id}`, data);
  },

  toggleItemAvailability: async (id: string): Promise<MenuItemResponse> => {
    return api.patch<MenuItemResponse>(`/restaurant-menu/items/${id}/toggle-availability`);
  },

  deleteMenuItem: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/restaurant-menu/items/${id}`);
  },

  // ── Delivery Locations ──────────────────────────────────────────
  getLocations: async (branchId?: string): Promise<DeliveryLocationResponse[]> => {
    return api.get<DeliveryLocationResponse[]>('/restaurant-delivery/locations', { params: { branchId } });
  },

  createLocation: async (data: { zoneName: string; deliveryFee: number; estimatedDeliveryMinutes?: number; sortOrder?: number; branchId?: string }): Promise<DeliveryLocationResponse> => {
    return api.post<DeliveryLocationResponse>('/restaurant-delivery/locations', data);
  },

  updateLocation: async (id: string, data: any): Promise<DeliveryLocationResponse> => {
    return api.patch<DeliveryLocationResponse>(`/restaurant-delivery/locations/${id}`, data);
  },

  deleteLocation: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/restaurant-delivery/locations/${id}`);
  },

  // ── Banners ─────────────────────────────────────────────────────
  getBanners: async (branchId?: string): Promise<RestaurantBannerResponse[]> => {
    return api.get<RestaurantBannerResponse[]>('/restaurant-menu/banners', { params: { branchId } });
  },

  createBanner: async (data: any): Promise<RestaurantBannerResponse> => {
    return api.post<RestaurantBannerResponse>('/restaurant-menu/banners', data);
  },

  updateBanner: async (id: string, data: any): Promise<RestaurantBannerResponse> => {
    return api.patch<RestaurantBannerResponse>(`/restaurant-menu/banners/${id}`, data);
  },

  deleteBanner: async (id: string): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/restaurant-menu/banners/${id}`);
  },

  // ── Analytics ───────────────────────────────────────────────────
  getAnalytics: async (branchId?: string, startDate?: string, endDate?: string): Promise<RestaurantAnalyticsResponse> => {
    return api.get<RestaurantAnalyticsResponse>('/restaurant-orders/analytics', {
      params: { branchId, startDate, endDate },
    });
  },
};
