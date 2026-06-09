import { api } from '../../../lib/api';
import type { BookingStatusType, PaymentMethodType, BookingSourceType, RoomStatusType } from '@citydenapartments/shared';

export interface BookingResponse {
  _id: string;
  bookingReference: string;
  branchId: string;
  roomId: {
    _id: string;
    roomNumber: string;
    roomTypeId?: { _id: string; name: string; basePrice: number };
    status: RoomStatusType;
  };
  guestDetails: { name: string; phone: string; email?: string };
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  actualPricePerNight: number;
  discount: number;
  discountReason?: string;
  totalAmountPaid: number;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  bookingStatus: BookingStatusType;
  bookingSource: BookingSourceType;
  createdAt: string;
}

export interface CreateBookingPayload {
  roomId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  numberOfGuests?: number;
  checkInDate: string;
  checkOutDate: string;
  actualPricePerNight: number;
  discount?: number;
  discountReason?: string;
  totalAmountPaid: number;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  bookingStatus?: BookingStatusType;
  bookingSource?: BookingSourceType;
}

export interface PaginatedBookings {
  items: BookingResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface BookingsQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const bookingsApi = {
  list: (query: BookingsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.status) params.set('status', query.status);
    if (query.search) params.set('search', query.search);
    const qs = params.toString();
    return api.get<PaginatedBookings>(`/bookings${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<BookingResponse>(`/bookings/${id}`),
  create: (data: CreateBookingPayload) => api.post<BookingResponse>('/bookings', data),
  checkIn: (id: string) => api.post<BookingResponse>(`/bookings/${id}/check-in`),
  checkOut: (id: string) => api.post<BookingResponse>(`/bookings/${id}/check-out`),
  cancel: (id: string) => api.post<BookingResponse>(`/bookings/${id}/cancel`),
};
