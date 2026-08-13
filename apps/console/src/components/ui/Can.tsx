import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/auth';
import type { UserRoleType } from '@citydenapartments/shared';

interface CanProps {
  roles: UserRoleType[];
  fallback?: ReactNode;
  children: ReactNode;
}

function normalizeRole(role: string): string {
  return String(role || '').toLowerCase().replace(/[\s_]+/g, '');
}

export function Can({ roles, fallback = null, children }: CanProps) {
  const { user } = useAuth();
  if (!user || !user.role) return <>{fallback}</>;
  const userNorm = normalizeRole(user.role);
  const match = roles.some((r) => normalizeRole(r) === userNorm);
  if (!match) return <>{fallback}</>;
  return <>{children}</>;
}

export function can(user: any, roles: UserRoleType[]): boolean {
  if (!user || !user.role) return false;
  const userNorm = normalizeRole(user.role);
  return roles.some((r) => normalizeRole(r) === userNorm);
}
