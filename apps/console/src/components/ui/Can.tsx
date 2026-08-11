import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/auth';
import type { UserRoleType } from '@citydenapartments/shared';

interface CanProps {
  roles: UserRoleType[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ roles, fallback = null, children }: CanProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as UserRoleType)) return <>{fallback}</>;
  return <>{children}</>;
}

export function can(user: any, roles: UserRoleType[]): boolean {
  return !!user && roles.includes(user.role);
}
