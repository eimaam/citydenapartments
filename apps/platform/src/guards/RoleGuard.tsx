import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth';
import type { UserRoleType } from '../lib/types';

interface RoleGuardProps {
  roles: UserRoleType[];
  children?: React.ReactNode;
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children ? <>{children}</> : <Outlet />;
}
