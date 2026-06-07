// ── User Roles ──────────────────────────────────────────────────
export const UserRole = {
  SuperAdmin: 'SuperAdmin',
  Reception: 'Reception',
  KitchenStaff: 'KitchenStaff',
  SocialMediaManager: 'SocialMediaManager',
} as const;
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// ── Booking Statuses ────────────────────────────────────────────
export const BookingStatus = {
  Confirmed: 'Confirmed',
  Checked_In: 'Checked_In',
  Checked_Out: 'Checked_Out',
  Cancelled: 'Cancelled',
} as const;
export type BookingStatusType = (typeof BookingStatus)[keyof typeof BookingStatus];

// ── Room Statuses ───────────────────────────────────────────────
export const RoomStatus = {
  Available: 'available',
  Occupied: 'occupied',
  Dirty: 'dirty',
  Maintenance: 'maintenance',
} as const;
export type RoomStatusType = (typeof RoomStatus)[keyof typeof RoomStatus];

// ── Payment Methods ─────────────────────────────────────────────
export const PaymentMethod = {
  Cash: 'Cash',
  POS_Card: 'POS_Card',
  Bank_Transfer: 'Bank_Transfer',
} as const;
export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ── Booking Sources ─────────────────────────────────────────────
export const BookingSource = {
  WalkIn: 'WalkIn',
  Phone: 'Phone',
  Online: 'Online',
} as const;
export type BookingSourceType = (typeof BookingSource)[keyof typeof BookingSource];

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
