import { api } from '../../../lib/api';
import type {
  RestaurantOrderResponse,
  RestaurantOrderStatusType,
  RestaurantPaymentStatusType,
  RestaurantPaymentMethodType,
  MenuItemResponse,
} from '@citydenapartments/shared';

export interface GetOrdersParams {
  page?: number;
  limit?: number;
  orderStatus?: string;
  deliveryType?: string;
  paymentStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface OrdersListResponse {
  orders: RestaurantOrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const restaurantOrdersApi = {
  getOrders: async (params?: GetOrdersParams): Promise<OrdersListResponse> => {
    return api.get<OrdersListResponse>('/restaurant-orders', { params });
  },

  getOrderById: async (id: string): Promise<RestaurantOrderResponse> => {
    return api.get<RestaurantOrderResponse>(`/restaurant-orders/${id}`);
  },

  updateStatus: async (
    id: string,
    status: RestaurantOrderStatusType,
    notes?: string,
  ): Promise<RestaurantOrderResponse> => {
    return api.patch<RestaurantOrderResponse>(`/restaurant-orders/${id}/status`, { status, notes });
  },

  updatePaymentStatus: async (
    id: string,
    paymentStatus: RestaurantPaymentStatusType,
    paymentMethod?: RestaurantPaymentMethodType,
  ): Promise<RestaurantOrderResponse> => {
    return api.patch<RestaurantOrderResponse>(`/restaurant-orders/${id}/payment-status`, {
      paymentStatus,
      paymentMethod,
    });
  },

  getMenuItems: async (params?: { categoryId?: string; search?: string }): Promise<{ items: MenuItemResponse[] }> => {
    return api.get<{ items: MenuItemResponse[] }>('/restaurant-menu/items', { params });
  },

  toggleItemAvailability: async (id: string): Promise<MenuItemResponse> => {
    return api.patch<MenuItemResponse>(`/restaurant-menu/items/${id}/toggle-availability`);
  },
};
