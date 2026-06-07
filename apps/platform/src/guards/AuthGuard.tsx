import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth';
import { Spinner } from '../components/ui/Spinner';

export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-surface">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function GuestGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-svh bg-surface">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
