// ── User Roles ──────────────────────────────────────────────────
export const UserRole = {
  SuperAdmin: 'SuperAdmin',
  GroupGM: 'GroupGM',
  FacilityManager: 'FacilityManager',
  FrontOfficeManager: 'FrontOfficeManager',
  Accountant: 'Accountant',
  HouseKeeper: 'HouseKeeper',
  Reception: 'Reception',
  KitchenStaff: 'KitchenStaff',
  StoreManager: 'StoreManager',
  StoreKeeper: 'StoreKeeper',
  IT: 'IT',
} as const;
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// ── Booking Statuses ────────────────────────────────────────────
export const BookingStatus = {
  Reserved: 'reserved',
  Confirmed: 'confirmed',
  Checked_In: 'checked_in',
  Checked_Out: 'checked_out',
  Cancelled: 'cancelled',
} as const;
export type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];

export const RoomStatus = {
  Available: 'available',
  Occupied: 'occupied',
  Dirty: 'dirty',
  Maintenance: 'maintenance',
} as const;
export type RoomStatusType = (typeof RoomStatus)[keyof typeof RoomStatus];

export const PaymentMethod = {
  Cash: 'cash',
  POS_Card: 'pos_card',
  Bank_Transfer: 'bank_transfer',
} as const;
export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const DiscountType = {
  Fixed: 'fixed',
  Percentage: 'percentage',
} as const;
export type DiscountTypeType = (typeof DiscountType)[keyof typeof DiscountType];

export const BookingSource = {
  WalkIn: 'walk_in',
  Phone: 'phone',
  Online: 'online',
} as const;
export type BookingSourceType = (typeof BookingSource)[keyof typeof BookingSource];

export const Gender = {
  Male: 'male',
  Female: 'female',
} as const;
export type GenderType = (typeof Gender)[keyof typeof Gender];

// ── Laundry ───────────────────────────────────────────────────
export const LaundryService = {
  Laundry: 'laundry',
  Pressing: 'pressing',
} as const;
export type LaundryServiceType = (typeof LaundryService)[keyof typeof LaundryService];

export const LaundryStatus = {
  Pending: 'pending',
  Paid: 'paid',
} as const;
export type LaundryStatusType = (typeof LaundryStatus)[keyof typeof LaundryStatus];

export interface LaundryCategoryResponse {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface LaundryItemResponse {
  _id: string;
  categoryId: string;
  category: string;
  item: string;
  laundryPrice: number;
  pressingPrice: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface LaundryBillLineResponse {
  itemId: string;
  itemName: string;
  category: string;
  service: LaundryServiceType;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface LaundryBillResponse {
  _id: string;
  billNumber: string;
  branchId: string;
  customerId?: string;
  customer?: Pick<CustomerResponse, '_id' | 'name' | 'phone'>;
  walkIn?: { name: string; phone?: string };
  roomNumber?: string;
  lines: LaundryBillLineResponse[];
  subtotal: number;
  total: number;
  status: LaundryStatusType;
  notes?: string;
  createdBy?: { _id: string; name?: string };
  createdAt: string;
  updatedAt: string;
}

// ── Departments ────────────────────────────────────────────────
export const Departments = [
  'Housekeeping',
  'Kitchen',
  'Front Desk',
  'Maintenance',
  'Admin',
  'Laundry',
  'Security',
] as const;
export type DepartmentType = (typeof Departments)[number];

// ── Auth shapes ─────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
  isActive: boolean;
  passwordChangedAt: string | null;
  allowedBranches: string[];
  activeBranchId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface BranchLifetimeDiscount {
  branchId: string;
  percentage: number;
  updatedBy?: string;
  updatedAt?: string;
  reason?: string;
}

export interface CustomerResponse {
  _id: string;
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
  totalVisits: number;
  totalSpent: number;
  walletBalance?: number;
  lastVisitDate?: string;
  createdAt: string;
  branchLifetimeDiscounts?: BranchLifetimeDiscount[];
}

export interface CustomerWalletLogResponse {
  _id: string;
  customerId: string;
  branchId: { _id: string; name: string } | string;
  bookingId?: { _id: string; bookingReference: string } | string;
  type: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  performedBy?: { _id: string; name: string; email: string };
  createdAt: string;
}

export type CustomerTimelineEventType =
  | 'profile_created'
  | 'booking_created'
  | 'checked_in'
  | 'checked_out'
  | 'booking_cancelled'
  | 'laundry_bill'
  | 'vip_discount_updated';

export interface CustomerTimelineEvent {
  id: string;
  eventType: CustomerTimelineEventType;
  timestamp: string;
  title: string;
  description?: string;
  branchName?: string;
  performedBy?: {
    id: string;
    name: string;
    role?: string;
  };
  details?: {
    bookingId?: string;
    bookingReference?: string;
    roomNumbers?: string[];
    roomTypes?: string[];
    checkInDate?: string;
    checkOutDate?: string;
    actualCheckedInAt?: string;
    actualCheckedOutAt?: string;
    nights?: number;
    baseRoomTotal?: number;
    discountType?: string;
    discountPercentage?: number;
    discountAmount?: number;
    discountReason?: string;
    discountCode?: string;
    vipDiscountPercentage?: number;
    vatAmount?: number;
    serviceChargeAmount?: number;
    totalAmountPaid?: number;
    paymentMethod?: string;
    paymentReference?: string;
    bookingStatus?: string;
    isFirstVisit?: boolean;
    isReturnVisit?: boolean;
    visitNumber?: number;
    billNumber?: string;
    laundryTotal?: number;
    laundryItemsCount?: number;
    laundryStatus?: string;
    oldPercentage?: number;
    newPercentage?: number;
  };
}

export interface CustomerGuestLedgerSummary {
  totalVisits: number;
  totalSpent: number;
  totalBilled: number;
  totalPaid: number;
  totalDiscountsSaved: number;
  firstVisitDate?: string;
  lastVisitDate?: string;
  activeVipDiscounts: Array<{
    branchId: string;
    branchName?: string;
    percentage: number;
  }>;
}

export interface CustomerTimelineResponse {
  customer: CustomerResponse;
  summary: CustomerGuestLedgerSummary;
  events: CustomerTimelineEvent[];
  queryWindow: {
    startDate?: string;
    endDate?: string;
    totalEvents: number;
  };
}


export const INVENTORY_UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'litres', label: 'Litres (L)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'packs', label: 'Packs' },
  { value: 'bags', label: 'Bags' },
  { value: 'cups', label: 'Cups' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'cartons', label: 'Cartons' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'rolls', label: 'Rolls' },
  { value: 'pairs', label: 'Pairs' },
  { value: 'sets', label: 'Sets' },
  { value: 'units', label: 'Units' },
] as const;

export interface RevenueLogResponse {
  _id: string;
  branchId: string;
  departmentId: { _id: string; name: string; code?: string } | string;
  revenueDate: string;
  cashAmount: number;
  posAmount: number;
  transferAmount: number;
  otherAmount: number;
  totalAmount: number;
  notes?: string;
  loggedBy: { _id: string; name: string; email: string; role: string } | string;
  loggedAt: string;
  createdAt: string;
}

export interface DepartmentRevenueCard {
  departmentId: string;
  departmentName: string;
  departmentCode?: string;
  totalRevenue: number;
  cashAmount: number;
  posAmount: number;
  transferAmount: number;
  otherAmount: number;
  logCount: number;
}

export interface RevenueLogSummaryResponse {
  overall: {
    totalRevenue: number;
    totalCash: number;
    totalPos: number;
    totalTransfer: number;
    totalOther: number;
    totalEntries: number;
  };
  departmentCards: DepartmentRevenueCard[];
}
