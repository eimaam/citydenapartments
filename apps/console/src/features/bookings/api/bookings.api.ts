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

export const bookingsApi = {
  list: () => api.get<BookingResponse[]>('/bookings'),
  get: (id: string) => api.get<BookingResponse>(`/bookings/${id}`),
  create: (data: CreateBookingPayload) => api.post<BookingResponse>('/bookings', data),
  checkIn: (id: string) => api.post<BookingResponse>(`/bookings/${id}/check-in`),
  checkOut: (id: string) => api.post<BookingResponse>(`/bookings/${id}/check-out`),
  cancel: (id: string) => api.post<BookingResponse>(`/bookings/${id}/cancel`),
};
