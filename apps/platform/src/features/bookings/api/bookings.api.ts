import { api } from '../../../lib/api';
import type { BookingStatusType, PaymentMethodType, BookingSourceType, RoomStatusType } from '@citydenapartments/shared';
import type { RoomResponse } from '../../rooms/api/rooms.api';

export interface StatusHistoryEntry {
  fromStatus: string;
  toStatus: string;
  changedBy?: { _id: string; firstName: string; lastName: string };
  changedAt: string;
}

export interface RoomBookingEntry {
  roomId: {
    _id: string;
    roomNumber: string;
    roomTypeId?: { _id: string; name: string };
    status: RoomStatusType;
  };
  actualPricePerNight: number;
  totalForRoom: number;
  maxGuests: number;
}

export interface BookingResponse {
  _id: string;
  bookingReference: string;
  branchId: string;
  customerId?: string;
  rooms: RoomBookingEntry[];
  guestDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    nationality: string;
    dob?: string;
    phone2?: string;
    comingFrom: string;
    stateOfOrigin: string;
    occupation: string;
    nextDestination: string;
    gender: string;
    religion?: string;
  };
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  discount: number;
  discountPercentage: number;
  discountReason?: string;
  totalAmountPaid: number;
  baseRoomTotal?: number;
  includeVat?: boolean;
  includeServiceCharge?: boolean;
  vatAmount?: number;
  serviceChargeAmount?: number;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  bookingStatus: BookingStatusType;
  bookingSource: BookingSourceType;
  createdAt: string;
  bookedBy?: { _id: string; firstName: string; lastName: string };
  checkedInBy?: { _id: string; firstName: string; lastName: string };
  checkedOutBy?: { _id: string; firstName: string; lastName: string };
  cancelledBy?: { _id: string; firstName: string; lastName: string };
  checkedInAt?: string;
  checkedOutAt?: string;
  statusHistory?: StatusHistoryEntry[];
  extensionHistory?: Array<{
    extensionIndex: number;
    previousCheckOutDate: string;
    newCheckOutDate: string;
    additionalNights: number;
    additionalBaseTotal: number;
    additionalDiscount?: number;
    additionalVat?: number;
    additionalServiceCharge?: number;
    additionalAmountPaid: number;
    paymentMethod: PaymentMethodType | string;
    paymentReference?: string;
    walletAmountApplied?: number;
    notes?: string;
    extendedBy?: { _id: string; firstName?: string; lastName?: string };
    extendedAt: string;
  }>;
}

export interface ExtendBookingPayload {
  newCheckOutDate: string;
  additionalAmountPaid: number;
  paymentMethod: PaymentMethodType | string;
  paymentReference?: string;
  walletAmountApplied?: number;
  discountType?: string;
  discountPercentage?: number;
  discountAmount?: number;
  discountReason?: string;
  includeVat?: boolean;
  includeServiceCharge?: boolean;
  vatAmount?: number;
  serviceChargeAmount?: number;
  notes?: string;
}

export interface CreateRoomBookingPayload {
  roomId: string;
  actualPricePerNight: number;
  maxGuests: number;
}

export interface CreateBookingPayload {
  rooms: CreateRoomBookingPayload[];
  customerId?: string;
  customerPhone?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestAddress: string;
  guestNationality: string;
  guestDob?: string;
  guestPhone2?: string;
  guestComingFrom: string;
  guestStateOfOrigin: string;
  guestOccupation: string;
  guestNextDestination: string;
  guestGender: string;
  guestReligion?: string;
  numberOfGuests?: number;
  checkInDate: string;
  checkOutDate: string;
  discountPercentage?: number;
  discountReason?: string;
  discountCode?: string;
  includeVat?: boolean;
  includeServiceCharge?: boolean;
  vatAmount?: number;
  serviceChargeAmount?: number;
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

export interface CalendarData {
  rooms: RoomResponse[];
  bookings: BookingResponse[];
}

export interface OccupancyReportResponse {
  date: string;
  metrics: {
    totalOccupiedRooms: number;
    totalGuestCount: number;
    totalRoomRevenue: number;
    totalDiscount: number;
    totalVat: number;
    totalServiceCharge: number;
    totalRateCharged: number;
    totalAmountPaid: number;
    totalOutstandingBalance: number;
  };
  rows: Array<{
    sn: number;
    roomType: string;
    guestName: string;
    roomRate: number;
    discount: number;
    vat: number;
    serviceCharge: number;
    rateCharged: number;
    amountPaid: number;
    outstandingBalance: number;
  }>;
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
  extend: (id: string, data: ExtendBookingPayload) => api.post<BookingResponse>(`/bookings/${id}/extend`, data),
  cancel: (id: string) => api.post<BookingResponse>(`/bookings/${id}/cancel`),
  calendar: (year: number, month: number) =>
    api.get<CalendarData>(`/bookings/calendar?year=${year}&month=${month}`),
  exportOccupancyReport: (date?: string) =>
    api.get<OccupancyReportResponse>(`/bookings/export/occupancy${date ? `?date=${date}` : ''}`),
};
