import { format, getHours } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { UserRole } from '@citydenapartments/shared';
import { dashboardApi, type DashboardSummary, type AccountingSummary } from '../api/dashboard.api';
import { CalendarCheck, Users, DoorOpen, Coffee, Clock, TrendingUp, DollarSign, PieChart, Receipt, BadgePercent, Banknote, CreditCard, Landmark, Package } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === UserRole.Reception || user?.role === UserRole.FrontOfficeManager || user?.role === UserRole.FacilityManager) return <ReceptionDashboard />;
  if (user?.role === UserRole.KitchenStaff) return <KitchenDashboard />;
  if (user?.role === UserRole.Accountant) return <AccountantDashboard />;
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

function AccountantDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.accounting()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.activeBranchId]);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Accounting</span></div>
        <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>
      </div>
    );
  }

  if (!data) return null;

  const r = data.revenue;
  const d = data.discounts;
  const b = data.bookings;
  const paymentIcon = (method: string) => {
    if (method === 'cash') return Banknote;
    if (method === 'pos_card') return CreditCard;
    return Landmark;
  };
  const paymentLabel = (method: string) => {
    if (method === 'cash') return 'Cash';
    if (method === 'pos_card') return 'POS / Card';
    return 'Bank Transfer';
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Accounting</span></div>
      <h1 className="font-serif text-3xl sm:text-4xl text-on-surface mb-2">Financial Overview</h1>
      <p className="text-on-surface-variant -mt-6">Revenue, discounts, and booking breakdown for {user?.activeBranchId ? 'your branch' : 'all branches'}.</p>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₦${r.total.toLocaleString()}`, icon: DollarSign, color: '#d4af37' },
          { label: "Today's Revenue", value: `₦${r.today.toLocaleString()}`, icon: Receipt, color: '#3b82f6' },
          { label: 'This Month', value: `₦${r.thisMonth.toLocaleString()}`, icon: TrendingUp, color: '#10b981' },
          { label: 'Avg / Booking', value: `₦${r.averagePerBooking.toLocaleString()}`, icon: PieChart, color: '#8b5cf6' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
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

      {/* Payment Method Breakdown + Discounts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Revenue by Payment Method */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Revenue by Payment Method</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(r.byPaymentMethod).map(([method, amount]) => {
              const Icon = paymentIcon(method);
              const pct = r.total > 0 ? ((amount / r.total) * 100).toFixed(1) : '0.0';
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-outline" />
                    <span className="text-sm text-on-surface">{paymentLabel(method)}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-on-surface">₦{amount.toLocaleString()}</p>
                    <p className="text-[10px] text-outline">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discount Analysis */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            <h2 className="text-sm font-semibold text-on-surface">Discount Analysis</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-outline uppercase tracking-wide">All Time</p>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <div>
                  <p className="text-lg font-bold text-on-surface">₦{d.totalGiven.toLocaleString()}</p>
                  <p className="text-[10px] text-outline">Total Given</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface">{d.averagePercentage}%</p>
                  <p className="text-[10px] text-outline">Avg Discount</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface">{d.totalBookingsWithDiscount}</p>
                  <p className="text-[10px] text-outline">Bookings w/ Discount</p>
                </div>
              </div>
            </div>
            <div className="border-t border-outline-variant pt-3">
              <p className="text-[10px] text-outline uppercase tracking-wide">This Month</p>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <div>
                  <p className="text-lg font-bold text-on-surface">₦{d.thisMonth.totalGiven.toLocaleString()}</p>
                  <p className="text-[10px] text-outline">Discounts Given</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface">{d.thisMonth.averagePercentage}%</p>
                  <p className="text-[10px] text-outline">Avg Discount</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-on-surface">{d.thisMonth.bookingsWithDiscount}</p>
                  <p className="text-[10px] text-outline">Bookings w/ Discount</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Status + Inventory */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Booking Status Breakdown</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Reserved', value: b.reserved, color: '#f59e0b' },
              { label: 'Confirmed', value: b.confirmed, color: '#3b82f6' },
              { label: 'Checked In', value: b.checked_in, color: '#10b981' },
              { label: 'Checked Out', value: b.checked_out, color: '#6b7280' },
              { label: 'Cancelled', value: b.cancelled, color: '#ef4444' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-on-surface">{s.label}</span>
                </div>
                <span className="text-sm font-medium text-on-surface">{s.value}</span>
              </div>
            ))}
            <div className="border-t border-outline-variant pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface">Total Bookings</span>
                <span className="text-sm font-bold text-on-surface">{b.total}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Inventory</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#06b6d415' }}>
                <Package size={16} style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-on-surface">{data.inventory.totalItems}</p>
                <p className="text-[10px] text-outline">Active Inventory Items</p>
              </div>
            </div>
            <div className="border-t border-outline-variant pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-outline">Total Value</span>
                <span className="text-sm font-bold text-on-surface">₦{data.inventory.totalValue.toLocaleString()}</span>
              </div>
              {data.inventory.expiringItems > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-outline">Expiring Soon</span>
                  <span className="text-sm font-bold text-amber-500">{data.inventory.expiringItems} items</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Trend */}
      {data.dailyRevenue.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Daily Revenue (Last 14 Days)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left py-2 text-[10px] text-outline uppercase tracking-wide font-medium">Date</th>
                  <th className="text-right py-2 text-[10px] text-outline uppercase tracking-wide font-medium">Bookings</th>
                  <th className="text-right py-2 text-[10px] text-outline uppercase tracking-wide font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyRevenue.map((day) => (
                  <tr key={day.date} className="border-b border-outline-variant/50 last:border-0">
                    <td className="py-2 text-on-surface">{format(new Date(day.date), 'MMM d, yyyy')}</td>
                    <td className="py-2 text-right text-on-surface">{day.count}</td>
                    <td className="py-2 text-right font-medium text-on-surface">₦{day.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
