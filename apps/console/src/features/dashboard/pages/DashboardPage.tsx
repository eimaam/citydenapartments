import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { api } from '../../../lib/api';
import { Input } from '@citydenapartments/shared';
import { Building2, TrendingUp, Users, BedDouble, CalendarCheck, MapPin, ChevronDown, Coffee, Receipt, DollarSign } from 'lucide-react';
import { revenueApi } from '../../department-expenses/api/department-expenses.api';

const PERIODS = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
];

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface Summary {
  overview: {
    totalRevenue?: number;
    occupancyRate: number;
    totalRooms?: number;
    totalBookings?: number;
    activeUsers?: number;
    checkedInGuests: number;
    pendingCheckIns: number;
    todayArrivals: number;
  };
  breakfast?: {
    total: number;
    served: number;
    pending: number;
  };
  byBranch?: Array<{
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchOpen, setBranchOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ items: Branch[] }>('/branches').then((res) => setBranches(res.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = selectedBranchId ? `?branchId=${selectedBranchId}` : '';
    api.get<Summary>(`/dashboard/summary${params}`)
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedBranchId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeBranch = branches.find((b) => b._id === selectedBranchId);

  const [revenuePeriod, setRevenuePeriod] = useState('month');
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const [revenueData, setRevenueData] = useState<{
    bookingRevenue: number;
    bookingCount: number;
    departmentExpenses: number;
    expenseCount: number;
    totalRevenue: number;
    period: { from: string; to: string; label: string | null };
  } | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const fetchRevenue = async (period: string, from?: string, to?: string) => {
    setRevenueLoading(true);
    try {
      const params: any = {};
      if (from && to) {
        params.fromDate = from;
        params.toDate = to;
      } else {
        params.period = period;
      }
      const data = await revenueApi.get(params);
      setRevenueData(data);
    } catch { /* ignore */ }
    finally { setRevenueLoading(false); }
  };

  useEffect(() => {
    fetchRevenue('month');
  }, []);

  const onPeriodClick = (period: string) => {
    setRevenuePeriod(period);
    setRevFromDate('');
    setRevToDate('');
    fetchRevenue(period);
  };

  const onDateRangeApply = () => {
    if (revFromDate && revToDate) {
      setRevenuePeriod('');
      fetchRevenue('', revFromDate, revToDate);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>;
  if (error) return <div className="p-8 text-center text-error">{error}</div>;
  if (!summary) return null;

  const { overview = {} as Summary['overview'], byBranch, breakfast } = summary;

  const o = overview;
  const stats = [
    o.totalRevenue !== undefined && { label: 'Revenue', value: `₦${o.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: '#10b981' },
    { label: 'Occupancy', value: `${o.occupancyRate ?? 0}%`, icon: BedDouble, color: '#d4af37' },
    o.totalBookings !== undefined && { label: 'Total Bookings', value: o.totalBookings, icon: CalendarCheck, color: '#3b82f6' },
    { label: 'In-House Guests', value: o.checkedInGuests ?? 0, icon: Users, color: '#8b5cf6' },
    { label: 'Pending Check-ins', value: o.pendingCheckIns ?? 0, icon: CalendarCheck, color: '#f59e0b' },
    { label: "Today's Arrivals", value: o.todayArrivals ?? 0, icon: Building2, color: '#6366f1' },
    o.activeUsers !== undefined && { label: 'Active Staff', value: o.activeUsers, icon: Users, color: '#ec4899' },
    o.totalRooms !== undefined && { label: 'Total Rooms', value: o.totalRooms, icon: BedDouble, color: '#14b8a6' },
    breakfast && { label: 'Breakfast', value: `${breakfast.served}/${breakfast.total}`, icon: Coffee, color: '#a855f7' },
  ].filter(Boolean) as Array<{ label: string; value: string | number; icon: any; color: string }>;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface mb-2">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-on-surface-variant">
            {activeBranch ? `Overview for ${activeBranch.name}` : 'System-wide overview across all branches.'}
          </p>
        </div>

        {user?.role !== 'Reception' && (
        <div className="relative flex-shrink-0" ref={branchRef}>
          <button
            onClick={() => setBranchOpen(!branchOpen)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-outline-variant bg-surface-container-low text-sm text-on-surface-variant hover:border-primary transition-all cursor-pointer"
          >
            <MapPin size={14} className="text-primary" />
            <span className="font-medium">{activeBranch ? activeBranch.name : 'All Branches'}</span>
            <ChevronDown size={14} className={`transition-transform ${branchOpen ? 'rotate-180' : ''}`} />
          </button>

          {branchOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-ambient z-50 py-1">
              <button
                onClick={() => { setSelectedBranchId(''); setBranchOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
              >
                <span className="flex-1 text-left font-medium">All Branches</span>
                {!selectedBranchId && <span className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-primary" /></span>}
              </button>
              <div className="border-t border-outline-variant my-1" />
              {branches.map((b) => (
                <button
                  key={b._id}
                  onClick={() => { setSelectedBranchId(b._id); setBranchOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
                >
                  <span className="flex-1 text-left">{b.name}</span>
                  <span className="text-[10px] font-mono text-outline">{b.code}</span>
                  {selectedBranchId === b._id && <span className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-primary" /></span>}
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

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

      {!selectedBranchId && byBranch && (
        <>
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
        </>
      )}

      {/* ── Revenue Overview ── */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-px bg-primary" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Finance</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={22} className="text-outline" />
            <h2 className="font-serif text-xl sm:text-2xl text-on-surface">Revenue Overview</h2>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <div className="flex gap-1 p-1 rounded bg-surface-container">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => onPeriodClick(p.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
                style={{
                  background: revenuePeriod === p.value ? 'var(--color-surface-container-lowest)' : 'transparent',
                  color: revenuePeriod === p.value ? 'var(--color-on-surface)' : 'var(--color-outline)',
                  boxShadow: revenuePeriod === p.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-outline-variant" />
          <div className="flex items-center gap-2">
            <Input type="date" size="sm" value={revFromDate} onChange={(e) => setRevFromDate(e.target.value)} className="!w-36" />
            <span className="text-xs text-outline">—</span>
            <Input type="date" size="sm" value={revToDate} onChange={(e) => setRevToDate(e.target.value)} className="!w-36" />
            <button
              onClick={onDateRangeApply}
              disabled={!revFromDate || !revToDate}
              className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Revenue cards */}
        {revenueLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : revenueData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
                  <DollarSign size={16} style={{ color: '#10b981' }} />
                </div>
                <span className="text-xs text-outline">Total Revenue</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">₦{revenueData.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-outline mt-1">
                Booking Revenue: ₦{revenueData.bookingRevenue.toLocaleString()} · Expenses: ₦{revenueData.departmentExpenses.toLocaleString()}
              </p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
                  <CalendarCheck size={16} style={{ color: '#3b82f6' }} />
                </div>
                <span className="text-xs text-outline">Booking Revenue</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">₦{revenueData.bookingRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-outline mt-1">{revenueData.bookingCount} booking{revenueData.bookingCount !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#f59e0b15' }}>
                  <Receipt size={16} style={{ color: '#f59e0b' }} />
                </div>
                <span className="text-xs text-outline">Department Expenses</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">₦{revenueData.departmentExpenses.toLocaleString()}</p>
              <p className="text-[10px] text-outline mt-1">{revenueData.expenseCount} expense{revenueData.expenseCount !== 1 ? 's' : ''}</p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#8b5cf615' }}>
                  <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
                </div>
                <span className="text-xs text-outline">Net Revenue</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">
                ₦{(revenueData.bookingRevenue - revenueData.departmentExpenses).toLocaleString()}
              </p>
              <p className="text-[10px] text-outline mt-1">
                {revenueData.period?.label || `${new Date(revenueData.period?.from).toLocaleDateString()} — ${new Date(revenueData.period?.to).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
