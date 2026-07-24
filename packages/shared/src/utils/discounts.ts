import { UserRole } from '../types';

/**
 * Single source of truth for maximum direct manual discount percentages allowed when creating a booking, by role.
 */
export const ROLE_MAX_MANUAL_DISCOUNT: Record<string, number> = {
  [UserRole.Reception]: 5,
  [UserRole.FrontOfficeManager]: 10,
  [UserRole.FacilityManager]: 15,
  [UserRole.GroupGM]: 50,
  [UserRole.SuperAdmin]: 50,
  [UserRole.IT]: 50,
};

/**
 * Single source of truth for maximum promo code generation percentages allowed, by role.
 */
export const ROLE_MAX_CODE_DISCOUNT: Record<string, number> = {
  [UserRole.FrontOfficeManager]: 10,
  [UserRole.FacilityManager]: 15,
  [UserRole.GroupGM]: 50,
  [UserRole.SuperAdmin]: 50,
  [UserRole.IT]: 50,
};

/**
 * Returns the maximum allowed direct manual discount percentage for a given user role.
 */
export function getMaxManualDiscount(role?: string): number {
  if (!role) return 50;
  return ROLE_MAX_MANUAL_DISCOUNT[role] ?? 0;
}

/**
 * Returns the maximum allowed promo code generation discount percentage for a given user role.
 */
export function getMaxCodeDiscount(role?: string): number {
  if (!role) return 50;
  return ROLE_MAX_CODE_DISCOUNT[role] ?? 0;
}
