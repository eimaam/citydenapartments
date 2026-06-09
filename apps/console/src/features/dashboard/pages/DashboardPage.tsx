import { format, getHours } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { api } from '../../../lib/api';
import { Building2, TrendingUp, Users, BedDouble, CalendarCheck } from 'lucide-react';

interface Summary {
  overview: {
    totalRevenue: number;
    occupancyRate: number;
    totalRooms: number;
    totalBookings: number;
    activeUsers: number;
    checkedInGuests: number;
    pendingCheckIns: number;
    todayArrivals: number;
  };
  byBranch: Array<{
    branchId: string;
    name: string;
    code: string;
    rooms: number;
    occupied: number;
    bookings: number;
    revenue: number;
    occupancyRate: number;
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Summary>('/dashboard/summary')
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.activeBranchId]);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>;
  if (error) return <div className="p-8 text-center text-error">{error}</div>;
  if (!summary) return null;

  const { overview, byBranch } = summary;

  const stats = [
    { label: 'Revenue', value: `₦${overview.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#10b981' },
    { label: 'Occupancy', value: `${overview.occupancyRate}%`, icon: BedDouble, color: '#d4af37' },
    { label: 'Total Bookings', value: overview.totalBookings, icon: CalendarCheck, color: '#3b82f6' },
    { label: 'In-House Guests', value: overview.checkedInGuests, icon: Users, color: '#8b5cf6' },
    { label: 'Pending Check-ins', value: overview.pendingCheckIns, icon: CalendarCheck, color: '#f59e0b' },
    { label: "Today's Arrivals", value: overview.todayArrivals, icon: Building2, color: '#6366f1' },
    { label: 'Active Staff', value: overview.activeUsers, icon: Users, color: '#ec4899' },
    { label: 'Total Rooms', value: overview.totalRooms, icon: BedDouble, color: '#14b8a6' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span>
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl text-on-surface mb-2">
        Welcome{user?.name ? `, ${user.name}` : ''}
      </h1>
      <p className="text-on-surface-variant mb-8">System-wide overview across all branches.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:border-outline hover:shadow-ambient transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <div style={{ color }}><Icon size={16} /></div>
              </div>
              <span className="text-xs text-outline">{label}</span>
            </div>
            <p className="text-3xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-serif text-xl text-on-surface mb-4">By Branch</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {byBranch.map((b) => (
          <div key={b.branchId} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:border-outline hover:shadow-ambient transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-lg text-on-surface">{b.name}</h3>
              <span className="text-[10px] font-mono text-outline">{b.code}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-xs text-outline">Revenue</span><p className="font-medium">₦{b.revenue.toLocaleString()}</p></div>
              <div><span className="text-xs text-outline">Occupancy</span><p className="font-medium">{b.occupancyRate}%</p></div>
              <div><span className="text-xs text-outline">Rooms</span><p>{b.rooms} ({b.occupied} occupied)</p></div>
              <div><span className="text-xs text-outline">Bookings</span><p>{b.bookings}</p></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
