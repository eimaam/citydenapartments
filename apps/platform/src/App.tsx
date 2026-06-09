import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/auth';
import { ToastProvider } from './components/ui/Toast';
import { ForcePasswordModal } from './components/ui/ForcePasswordModal';
import { AuthGuard, GuestGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';
import { MainLayout } from './components/layout/MainLayout';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import BookingsPage from './features/bookings/pages/BookingsPage';
import RoomsPage from './features/rooms/pages/RoomsPage';
import BreakfastPage from './features/breakfast/pages/BreakfastPage';

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

              <Route element={<RoleGuard roles={['Reception']} />}>
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="rooms" element={<RoomsPage />} />
              </Route>

              <Route element={<RoleGuard roles={['KitchenStaff']} />}>
                <Route path="breakfast" element={<BreakfastPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
