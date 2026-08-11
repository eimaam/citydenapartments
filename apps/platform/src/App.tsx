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
import SpoilagePage from './features/inventory/pages/SpoilagePage';
import InventoryBookPage from './features/inventory/pages/InventoryBookPage';
import CustomersPage from './features/customers/pages/CustomersPage';
import LaundryPage from './features/laundry/pages/LaundryPage';
import DiscountCodesPage from './features/discount-codes/pages/DiscountCodesPage';
import DepartmentExpensesPage from './features/department-expenses/pages/DepartmentExpensesPage';
import RevenueLogsPage from './features/revenue-logs/pages/RevenueLogsPage';

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

              <Route element={<RoleGuard roles={[UserRole.Reception, UserRole.FrontOfficeManager, UserRole.FacilityManager]} />}>
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

              <Route element={<RoleGuard roles={[UserRole.StoreKeeper, UserRole.StoreManager, UserRole.Accountant, UserRole.FacilityManager]} />}>
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="inventory/transactions" element={<TransactionsPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.SuperAdmin, UserRole.GroupGM, UserRole.StoreManager, UserRole.Accountant, UserRole.FacilityManager, UserRole.IT]} />}>
                <Route path="inventory/spoilage" element={<SpoilagePage />} />
                <Route path="inventory/book" element={<InventoryBookPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.Reception, UserRole.FrontOfficeManager, UserRole.FacilityManager]} />}>
                <Route path="customers" element={<CustomersPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.Reception, UserRole.FrontOfficeManager, UserRole.FacilityManager, UserRole.IT]} />}>
                <Route path="laundry" element={<LaundryPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FrontOfficeManager, UserRole.FacilityManager]} />}>
                <Route path="discount-codes" element={<DiscountCodesPage />} />
              </Route>

              <Route element={<RoleGuard roles={[UserRole.Accountant, UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager]} />}>
                <Route path="department-expenses" element={<DepartmentExpensesPage />} />
                <Route path="revenue-logs" element={<RevenueLogsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
