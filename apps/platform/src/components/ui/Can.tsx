import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/auth';
import type { UserRoleType, AuthUser } from '../../lib/types';

interface CanProps {
  roles: UserRoleType[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ roles, fallback = null, children }: CanProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}

export function can(user: AuthUser | null | undefined, roles: UserRoleType[]): boolean {
  return !!user && roles.includes(user.role);
}
