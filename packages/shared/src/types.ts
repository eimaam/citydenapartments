export const UserRole = {
  SuperAdmin: 'SuperAdmin',
  Reception: 'Reception',
  KitchenStaff: 'KitchenStaff',
  SocialMediaManager: 'SocialMediaManager',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];
