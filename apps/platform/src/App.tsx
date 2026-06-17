import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@citydenapartments/shared';
import { AuthProvider } from './contexts/auth';
import { ToastProvider } from './components/ui/Toast';
import { ForcePasswordModal } from './components/ui/ForcePasswordModal';
import { AuthGuard, GuestGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';
import { MainLayout } from './components/layout/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import BookingsPage from './features/bookings/pages/BookingsPage';
import CalendarPage from './features/bookings/pages/CalendarPage';
import RoomsPage from './features/rooms/pages/RoomsPage';
import BreakfastPage from './features/breakfast/pages/BreakfastPage';
import StaffPage from './features/staff/pages/StaffPage';
import InventoryPage from './features/inventory/pages/InventoryPage';
import TransactionsPage from './features/inventory/pages/TransactionsPage';

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
              <Route index element={<DashboardPage />} />

              <Route element={<RoleGuard roles={[UserRole.Reception, UserRole.FrontOfficeManager, UserRole.FacilityManager, UserRole.Accountant]} />}>
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="bookings/calendar" element={<CalendarPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.Reception, UserRole.FrontOfficeManager, UserRole.FacilityManager, UserRole.HouseKeeper]} />}>
                <Route path="rooms" element={<RoomsPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.KitchenStaff, UserRole.FacilityManager]} />}>
                <Route path="breakfast" element={<BreakfastPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.FacilityManager]} />}>
                <Route path="staff" element={<StaffPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.StoreKeeper, UserRole.StoreManager, UserRole.Accountant]} />}>
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/transactions" element={<TransactionsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
