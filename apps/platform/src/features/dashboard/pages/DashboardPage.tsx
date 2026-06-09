import { format, getHours } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { dashboardApi, type DashboardSummary } from '../api/dashboard.api';
import { CalendarCheck, Users, DoorOpen, Coffee, Clock, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'Reception') return <ReceptionDashboard />;
  if (user?.role === 'KitchenStaff') return <KitchenDashboard />;
  return <DefaultDashboard />;
}

function ReceptionDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.activeBranchId]);

  const stats = data ? [
    { label: "Today's Arrivals", value: data.overview.todayArrivals, icon: CalendarCheck, color: '#d4af37' },
    { label: 'Currently In-House', value: data.overview.checkedInGuests, icon: Users, color: '#3b82f6' },
    { label: 'Pending Check-ins', value: data.overview.pendingCheckIns, icon: Clock, color: '#f59e0b' },
    { label: 'Occupancy', value: `${data.overview.occupancyRate}%`, icon: TrendingUp, color: '#10b981' },
  ] : [];

  return renderDashboard('Front Desk', "Overview of today's arrivals, departures, and occupancy.", stats, loading);
}

function KitchenDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.summary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.activeBranchId]);

  const stats = data ? [
    { label: 'Total Guests', value: data.breakfast.total, icon: Users, color: '#3b82f6' },
    { label: 'Served', value: data.breakfast.served, icon: Coffee, color: '#10b981' },
    { label: 'Pending', value: data.breakfast.pending, icon: Clock, color: '#f59e0b' },
    { label: 'Coverage', value: data.breakfast.total ? `${Math.round((data.breakfast.served / data.breakfast.total) * 100)}%` : '—', icon: TrendingUp, color: '#d4af37' },
  ] : [];

  return renderDashboard('Kitchen', "Today's breakfast manifest — mark guests as they are served.", stats, loading);
}

function DefaultDashboard() {
  const { user } = useAuth();
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Overview</span></div>
      <h1 className="font-serif text-3xl sm:text-4xl text-on-surface mb-2">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
      <p className="text-on-surface-variant">You&apos;re signed in as <strong>{user?.role}</strong>.</p>
    </div>
  );
}

function renderDashboard(title: string, subtitle: string, stats: { label: string; value: string | number; icon: React.ComponentType<{ size?: number }>; color: string }[], loading: boolean) {
  const { user } = useAuth();
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">{title}</span></div>
      <h1 className="font-serif text-3xl sm:text-4xl text-on-surface mb-2">Good {getTimeOfDay()}{user?.name ? `, ${user.name}` : ''}</h1>
      <p className="text-on-surface-variant mb-8">{subtitle}</p>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 transition-all duration-300 hover:border-outline hover:shadow-ambient">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                    <div style={{ color: stat.color }}><Icon size={16} /></div>
                  </div>
                  <span className="text-xs text-outline">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold text-on-surface">{stat.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() { const h = getHours(new Date()); if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; return 'evening'; }
