import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/auth';
import type { UserRole } from '@citydenapartments/shared';

interface CanProps {
  roles: UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ roles, fallback = null, children }: CanProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as UserRole)) return <>{fallback}</>;
  return <>{children}</>;
}

export function can(user: any, roles: UserRole[]): boolean {
  return !!user && roles.includes(user.role);
}
