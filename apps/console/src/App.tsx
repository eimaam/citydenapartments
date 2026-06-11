import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@citydenapartments/shared';
import { AuthProvider } from './contexts/auth';
import { ToastProvider } from './components/ui/Toast';
import { ForcePasswordModal } from './components/ui/ForcePasswordModal';
import { AuthGuard, GuestGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';
import { MainLayout } from './components/layout/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import AdminDashboard from './features/dashboard/pages/DashboardPage';
import BranchesPage from './features/branches/pages/BranchesPage';
import RoomTypesPage from './features/room-types/pages/RoomTypesPage';
import RoomsPage from './features/rooms/pages/RoomsPage';
import BookingsPage from './features/bookings/pages/BookingsPage';
import StaffPage from './features/staff/pages/StaffPage';
import BreakfastPage from './features/breakfast/pages/BreakfastPage';
import InventoryPage from './features/inventory/pages/InventoryPage';
import InventoryTransactionsPage from './features/inventory/pages/TransactionsPage';
import RolesPage from './features/roles/pages/RolesPage';

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
            <Route element={<RoleGuard roles={[UserRole.SuperAdmin]} />}>
              <Route element={<MainLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="branches" element={<BranchesPage />} />
                <Route path="room-types" element={<RoomTypesPage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="breakfast" element={<BreakfastPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/transactions" element={<InventoryTransactionsPage />} />
                <Route path="roles" element={<RolesPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
