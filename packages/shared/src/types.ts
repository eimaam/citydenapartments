// ── User Roles ──────────────────────────────────────────────────
export const UserRole = {
  SuperAdmin: 'SuperAdmin',
  BranchManager: 'BranchManager',
  StoreManager: 'StoreManager',
  StoreKeeper: 'StoreKeeper',
  Reception: 'Reception',
  KitchenStaff: 'KitchenStaff',
  SocialMediaManager: 'SocialMediaManager',
  HouseKeeper: 'HouseKeeper',
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
