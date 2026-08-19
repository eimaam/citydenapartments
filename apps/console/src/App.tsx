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
import AccountantDashboard from './features/dashboard/pages/AccountantDashboard';
import BranchesPage from './features/branches/pages/BranchesPage';
import RoomTypesPage from './features/room-types/pages/RoomTypesPage';
import RoomsPage from './features/rooms/pages/RoomsPage';
import BookingsPage from './features/bookings/pages/BookingsPage';
import CalendarPage from './features/bookings/pages/CalendarPage';
import StatusHistoryPage from './features/bookings/pages/StatusHistoryPage';
import StaffPage from './features/staff/pages/StaffPage';
import EmployeePage from './features/employees/pages/EmployeePage';
import DepartmentPage from './features/departments/pages/DepartmentPage';
import BreakfastPage from './features/breakfast/pages/BreakfastPage';
import InventoryPage from './features/inventory/pages/InventoryPage';
import InventoryTransactionsPage from './features/inventory/pages/TransactionsPage';
import SpoilagePage from './features/inventory/pages/SpoilagePage';
import RolesPage from './features/roles/pages/RolesPage';
import DiscountCodesPage from './features/discount-codes/pages/DiscountCodesPage';
import AuditLogsPage from './features/audit/pages/AuditLogsPage';
import DepartmentExpensesPage from './features/department-expenses/pages/DepartmentExpensesPage';
import CustomersPage from './features/customers/pages/CustomersPage';
import CustomerDetailPage from './features/customers/pages/CustomerDetailPage';
import LaundryItemsPage from './features/laundry-items/pages/LaundryItemsPage';
import RevenueLogsPage from './features/revenue-logs/pages/RevenueLogsPage';
import MenuCatalogPage from './features/restaurant/pages/MenuCatalogPage';
import DeliveryZonesPage from './features/restaurant/pages/DeliveryZonesPage';
import BannersPage from './features/restaurant/pages/BannersPage';
import RestaurantAnalyticsPage from './features/restaurant/pages/RestaurantAnalyticsPage';
import type { UserRoleType } from './lib/types';

function ProtectedRoute({ roles, children }: { roles: UserRoleType[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Spinner />;
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DashboardSwitch() {
  const { user } = useAuth();
  if (user?.role === UserRole.Accountant) {
    return <AccountantDashboard />;
  }
  return <AdminDashboard />;
}

const routeRoles: Record<string, UserRoleType[]> = {
  '/': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.Accountant],
  '/branches': [UserRole.SuperAdmin],
  '/room-types': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.FrontOfficeManager],
  '/rooms': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.FrontOfficeManager],
  '/bookings': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FrontOfficeManager],
  '/bookings/calendar': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FrontOfficeManager],
  '/bookings/status-history': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/users': [UserRole.SuperAdmin, UserRole.IT],
  '/customers': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.FrontOfficeManager],
  '/customers/:id': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.FrontOfficeManager],
  '/employees': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/departments': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/breakfast': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/inventory': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.Accountant],
  '/inventory/transactions': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.Accountant],
  '/inventory/spoilage': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/discount-codes': [UserRole.SuperAdmin, UserRole.GroupGM],
  '/audit-logs': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/roles': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/department-expenses': [UserRole.Accountant, UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/revenue-logs': [UserRole.Accountant, UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/laundry-items': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/restaurant/menu': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.FacilityManager],
  '/restaurant/delivery-zones': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/restaurant/banners': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT],
  '/restaurant/analytics': [UserRole.SuperAdmin, UserRole.GroupGM, UserRole.IT, UserRole.Accountant],
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
                          case '/': return <DashboardSwitch />;
                          case '/branches': return <BranchesPage />;
                          case '/room-types': return <RoomTypesPage />;
                          case '/rooms': return <RoomsPage />;
                          case '/bookings': return <BookingsPage />;
                          case '/bookings/calendar': return <CalendarPage />;
                          case '/bookings/status-history': return <StatusHistoryPage />;
                          case '/customers': return <CustomersPage />;
                          case '/customers/:id': return <CustomerDetailPage />;
                          case '/users': return <StaffPage />;
                          case '/employees': return <EmployeePage />;
                          case '/departments': return <DepartmentPage />;
                          case '/breakfast': return <BreakfastPage />;
                          case '/inventory': return <InventoryPage />;
                          case '/inventory/transactions': return <InventoryTransactionsPage />;
                          case '/inventory/spoilage': return <SpoilagePage />;
                          case '/discount-codes': return <DiscountCodesPage />;
                          case '/audit-logs': return <AuditLogsPage />;
                          case '/department-expenses': return <DepartmentExpensesPage />;
                          case '/revenue-logs': return <RevenueLogsPage />;
                          case '/laundry-items': return <LaundryItemsPage />;
                          case '/roles': return <RolesPage />;
                          case '/restaurant/menu': return <MenuCatalogPage />;
                          case '/restaurant/delivery-zones': return <DeliveryZonesPage />;
                          case '/restaurant/banners': return <BannersPage />;
                          case '/restaurant/analytics': return <RestaurantAnalyticsPage />;
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

