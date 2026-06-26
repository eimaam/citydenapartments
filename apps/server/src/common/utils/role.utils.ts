export function hasElevatedRole(role: string): boolean {
  return role === 'SuperAdmin' || role === 'GroupGM' || role === 'IT';
}

export function isSuperAdmin(role: string): boolean {
  return role === 'SuperAdmin';
}

export function isAdminOrGroupGm(role: string): boolean {
  return role === 'SuperAdmin' || role === 'GroupGM';
}
