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
  lastVisitDate?: string;
  createdAt: string;
  branchLifetimeDiscounts?: BranchLifetimeDiscount[];
}
