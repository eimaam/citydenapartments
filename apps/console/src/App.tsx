import { useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '@citydenapartments/shared';
import { AuthProvider } from './contexts/auth';
import { useAuth } from './contexts/auth';
import { ToastProvider } from './components/ui/Toast';
import { ForcePasswordModal } from './components/ui/ForcePasswordModal';
import { AuthGuard, GuestGuard } from './guards/AuthGuard';
import { MainLayout } from './components/layout/MainLayout';
import { Spinner } from './components/ui/Spinner';
import LoginPage from './features/auth/pages/LoginPage';
import AdminDashboard from './features/dashboard/pages/DashboardPage';
import BranchesPage from './features/branches/pages/BranchesPage';
import RoomTypesPage from './features/room-types/pages/RoomTypesPage';
import RoomsPage from './features/rooms/pages/RoomsPage';
import BookingsPage from './features/bookings/pages/BookingsPage';
import CalendarPage from './features/bookings/pages/CalendarPage';
import StaffPage from './features/staff/pages/StaffPage';
import EmployeePage from './features/employees/pages/EmployeePage';
import BreakfastPage from './features/breakfast/pages/BreakfastPage';
import InventoryPage from './features/inventory/pages/InventoryPage';
import InventoryTransactionsPage from './features/inventory/pages/TransactionsPage';
import SpoilagePage from './features/inventory/pages/SpoilagePage';
import RolesPage from './features/roles/pages/RolesPage';
import type { UserRoleType } from './lib/types';

function ProtectedRoute({ roles, children }: { roles: UserRoleType[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const routeRoles: Record<string, UserRoleType[]> = {
  '/': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.Accountant],
  '/branches': [UserRole.SuperAdmin],
  '/room-types': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/rooms': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/bookings': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/bookings/calendar': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/staff': [UserRole.SuperAdmin, UserRole.IT],
  '/employees': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.FacilityManager, UserRole.Accountant, UserRole.StoreManager, UserRole.StoreKeeper],
  '/breakfast': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/inventory': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.Accountant],
  '/inventory/transactions': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.Accountant],
  '/inventory/spoilage': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/roles': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ForcePasswordModal />
        <Routes>
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<AuthGuard />}>
            <Route element={<MainLayout />}>
              {Object.entries(routeRoles).map(([path, roles]) => (
                <Route
                  key={path}
                  index={path === '/'}
                  path={path === '/' ? undefined : path.slice(1)}
                  element={
                    <ProtectedRoute roles={roles}>
                      {(() => {
                        switch (path) {
                          case '/': return <AdminDashboard />;
                          case '/branches': return <BranchesPage />;
                          case '/room-types': return <RoomTypesPage />;
                          case '/rooms': return <RoomsPage />;
                          case '/bookings': return <BookingsPage />;
                          case '/bookings/calendar': return <CalendarPage />;
                          case '/staff': return <StaffPage />;
                          case '/employees': return <EmployeePage />;
                          case '/breakfast': return <BreakfastPage />;
                          case '/inventory': return <InventoryPage />;
                          case '/inventory/transactions': return <InventoryTransactionsPage />;
                          case '/inventory/spoilage': return <SpoilagePage />;
                          case '/roles': return <RolesPage />;
                          default: return null;
                        }
                      })()}
                    </ProtectedRoute>
                  }
                />
              ))}
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
