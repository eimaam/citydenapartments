import { format, getHours } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/auth';
import { can } from '../../../components/ui/Can';
import { Spinner } from '../../../components/ui/Spinner';
import { UserRole } from '@citydenapartments/shared';
import { dashboardApi, type DashboardSummary, type AccountingSummary } from '../api/dashboard.api';
import { CalendarCheck, Users, DoorOpen, Coffee, Clock, TrendingUp, DollarSign, PieChart, Receipt, BadgePercent, Banknote, CreditCard, Landmark, Package, Download, FileText } from 'lucide-react';
import { MetricCard, exportToCSV, exportToPDF, Input, Table, formatCompactNumber } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';

export default function DashboardPage() {
  const { user } = useAuth();
  if (can(user, [UserRole.Accountant, UserRole.FacilityManager])) return <AccountantDashboard />;
  if (can(user, [UserRole.Reception, UserRole.FrontOfficeManager])) return <ReceptionDashboard />;
  if (can(user, [UserRole.KitchenStaff])) return <KitchenDashboard />;
  return <DefaultDashboard />;
}

function ReceptionDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

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

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!data) return;
    setExporting(format);
    try {
      const opts = {
        filename: 'front_desk_summary',
        title: 'Front Desk Summary',
        columns: [
          { title: 'Metric', dataIndex: 'label' as const },
          { title: 'Value', dataIndex: 'value' as const },
        ],
        data: [
          { label: "Today's Arrivals", value: data.overview.todayArrivals },
          { label: 'Currently In-House', value: data.overview.checkedInGuests },
          { label: 'Pending Check-ins', value: data.overview.pendingCheckIns },
          { label: 'Occupancy', value: `${data.overview.occupancyRate}%` },
        ],
      };
      if (format === 'csv') exportToCSV(opts);
      else exportToPDF(opts);
    } finally { setExporting(null); }
  }, [data]);

  const exportButtons = (
    <div className="flex gap-1">
      <button onClick={() => handleExport('csv')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
        {exporting === 'csv' ? <Spinner size={10} /> : <FileText size={11} />} CSV
      </button>
      <button onClick={() => handleExport('pdf')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
        {exporting === 'pdf' ? <Spinner size={10} /> : <Download size={11} />} PDF
      </button>
    </div>
  );

  return renderDashboard('Front Desk', "Overview of today's arrivals, departures, and occupancy.", stats, loading, exportButtons);
}

function KitchenDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

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

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!data) return;
    setExporting(format);
    try {
      const opts = {
        filename: 'kitchen_breakfast',
        title: 'Breakfast Summary',
        columns: [
          { title: 'Metric', dataIndex: 'label' as const },
          { title: 'Value', dataIndex: 'value' as const },
        ],
        data: [
          { label: 'Total Guests', value: data.breakfast.total },
          { label: 'Served', value: data.breakfast.served },
          { label: 'Pending', value: data.breakfast.pending },
          { label: 'Coverage', value: data.breakfast.total ? `${Math.round((data.breakfast.served / data.breakfast.total) * 100)}%` : '—' },
        ],
      };
      if (format === 'csv') exportToCSV(opts);
      else exportToPDF(opts);
    } finally { setExporting(null); }
  }, [data]);

  const exportButtons = (
    <div className="flex gap-1">
      <button onClick={() => handleExport('csv')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
        {exporting === 'csv' ? <Spinner size={10} /> : <FileText size={11} />} CSV
      </button>
      <button onClick={() => handleExport('pdf')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
        {exporting === 'pdf' ? <Spinner size={10} /> : <Download size={11} />} PDF
      </button>
    </div>
  );

  return renderDashboard('Kitchen', "Today's breakfast manifest — mark guests as they are served.", stats, loading, exportButtons);
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

const ACCT_PERIODS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
];

function AccountantDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const [revenuePeriod, setRevenuePeriod] = useState('daily');
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const [revenueData, setRevenueData] = useState<any>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  useEffect(() => {
    dashboardApi.accounting()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.activeBranchId]);

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
      const data = await dashboardApi.revenue(params);
      setRevenueData(data);
    } catch { /* ignore */ }
    finally { setRevenueLoading(false); }
  };

  useEffect(() => {
    fetchRevenue('daily');
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

  const handleDailyExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!data) return;
    setExporting(format);
    try {
      const opts = {
        filename: 'daily_revenue',
        title: 'Daily Revenue Report',
        columns: [
          { title: 'Date', dataIndex: 'date' as const },
          { title: 'Revenue', dataIndex: 'revenue' as const, render: (v: number) => `₦${v.toLocaleString()}` },
          { title: 'Bookings', dataIndex: 'count' as const },
        ],
        data: [...data.dailyRevenue].reverse(),
      };
      if (format === 'csv') exportToCSV(opts);
      else exportToPDF(opts);
    } finally { setExporting(null); }
  }, [data]);

  const handleRevenueExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!revenueData) return;
    setExporting(format);
    try {
      const opts = {
        filename: 'revenue_analysis',
        title: 'Revenue Analysis Report',
        columns: [
          { title: 'Metric', dataIndex: 'metric' as const },
          { title: 'Value', dataIndex: 'value' as const },
        ],
        data: [
          { metric: 'Total Revenue', value: `₦${revenueData.totalRevenue.toLocaleString()}` },
          { metric: 'Booking Revenue', value: `₦${revenueData.bookingRevenue.toLocaleString()}` },
          { metric: 'Booking Count', value: revenueData.bookingCount },
          { metric: 'Department Expenses', value: `₦${revenueData.departmentExpenses.toLocaleString()}` },
          { metric: 'Net Revenue', value: `₦${(revenueData.bookingRevenue - revenueData.departmentExpenses).toLocaleString()}` },
          { metric: 'VAT Collected', value: `₦${revenueData.vatCollected.toLocaleString()}` },
          { metric: 'Service Charge Collected', value: `₦${revenueData.serviceChargeCollected.toLocaleString()}` },
          { metric: 'Period', value: revenueData.period?.label || `${revenueData.period?.from} — ${revenueData.period?.to}` },
        ],
      };
      if (format === 'csv') exportToCSV(opts);
      else exportToPDF(opts);
    } finally { setExporting(null); }
  }, [revenueData]);

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
          { label: 'Total Revenue', value: `₦${formatCompactNumber(r.total)}`, icon: DollarSign, color: '#d4af37' },
          { label: "Today's Revenue", value: `₦${formatCompactNumber(r.today)}`, icon: Receipt, color: '#3b82f6' },
          { label: 'This Month', value: `₦${formatCompactNumber(r.thisMonth)}`, icon: TrendingUp, color: '#10b981' },
          { label: 'Avg / Booking', value: `₦${formatCompactNumber(r.averagePerBooking)}`, icon: PieChart, color: '#8b5cf6' },
        ].map((stat) => (
          <MetricCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} className="bg-surface-container-lowest" />
        ))}
      </div>

      {/* Payment Method Breakdown + Discounts */}
      <div className="grid md:grid-cols-2 gap-6">
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
                    <p className="text-sm font-medium text-on-surface">₦{formatCompactNumber(amount)}</p>
                    <p className="text-[10px] text-outline">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
                  <p className="text-lg font-bold text-on-surface">₦{formatCompactNumber(d.totalGiven)}</p>
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
                  <p className="text-lg font-bold text-on-surface">₦{formatCompactNumber(d.thisMonth.totalGiven)}</p>
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
                <span className="text-sm font-bold text-on-surface">₦{formatCompactNumber(data.inventory.totalValue)}</span>
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
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 p-5 pb-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Daily Revenue (Last 14 Days)</h2>
            <div className="ml-auto flex gap-1">
              <button onClick={() => handleDailyExport('csv')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
                {exporting === 'csv' ? <Spinner size={10} /> : <FileText size={11} />} CSV
              </button>
              <button onClick={() => handleDailyExport('pdf')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
                {exporting === 'pdf' ? <Spinner size={10} /> : <Download size={11} />} PDF
              </button>
            </div>
          </div>
          <div className="p-5">
            {(() => {
              const dailyColumns: TableProps<{ date: string; revenue: number; count: number }>['columns'] = [
                { title: 'Date', dataIndex: 'date', render: (_, d) => format(new Date(d.date), 'MMM d, yyyy') },
                { title: 'Revenue', dataIndex: 'revenue', align: 'right', render: (_, d) => `₦${d.revenue.toLocaleString()}` },
                { title: 'Bookings', dataIndex: 'count', align: 'right' },
              ];
              return (
                <Table
                  columns={dailyColumns}
                  dataSource={[...data.dailyRevenue].reverse()}
                  rowKey="date"
                  pagination={false}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Revenue Analysis */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Revenue Analysis</h2>
          {revenueData && (
            <div className="ml-auto flex gap-1">
              <button onClick={() => handleRevenueExport('csv')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
                {exporting === 'csv' ? <Spinner size={10} /> : <FileText size={11} />} CSV
              </button>
              <button onClick={() => handleRevenueExport('pdf')} disabled={exporting !== null} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent">
                {exporting === 'pdf' ? <Spinner size={10} /> : <Download size={11} />} PDF
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-surface-container rounded-lg">
          <div className="flex gap-1 p-0.5 rounded bg-surface-container-high">
            {ACCT_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => onPeriodClick(p.value)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-sm transition-all cursor-pointer"
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
          <div className="w-px h-5 bg-outline-variant" />
          <div className="flex items-center gap-2">
            <Input type="date" size="sm" value={revFromDate} onChange={(e) => setRevFromDate(e.target.value)} className="!w-32" />
            <span className="text-[10px] text-outline">—</span>
            <Input type="date" size="sm" value={revToDate} onChange={(e) => setRevToDate(e.target.value)} className="!w-32" />
            <button
              onClick={onDateRangeApply}
              disabled={!revFromDate || !revToDate}
              className="px-2.5 py-1 text-[11px] font-medium rounded bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
            >
              Apply
            </button>
          </div>
        </div>

        {revenueLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : revenueData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Total Revenue', value: `₦${formatCompactNumber(revenueData.totalRevenue)}`, color: '#10b981' },
              { label: 'Booking Revenue', value: `₦${formatCompactNumber(revenueData.bookingRevenue)}`, color: '#3b82f6' },
              { label: 'Department Expenses', value: `₦${formatCompactNumber(revenueData.departmentExpenses)}`, color: '#f59e0b' },
              { label: 'Net Revenue', value: `₦${formatCompactNumber(revenueData.bookingRevenue - revenueData.departmentExpenses)}`, color: '#8b5cf6' },
              { label: 'VAT Collected', value: `₦${formatCompactNumber(revenueData.vatCollected)}`, color: '#d97706' },
              { label: 'Service Charge', value: `₦${formatCompactNumber(revenueData.serviceChargeCollected)}`, color: '#2563eb' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container p-3 rounded">
                <span className="text-[10px] text-outline">{stat.label}</span>
                <p className="text-lg font-bold text-on-surface">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderDashboard(title: string, subtitle: string, stats: { label: string; value: string | number; icon: React.ComponentType<{ size?: number }>; color: string }[], loading: boolean, exportButtons?: React.ReactNode) {
  const { user } = useAuth();
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">{title}</span>
        {exportButtons && <div className="ml-auto">{exportButtons}</div>}
      </div>
      <h1 className="font-serif text-3xl sm:text-4xl text-on-surface mb-2">Good {getTimeOfDay()}{user?.name ? `, ${user.name}` : ''}</h1>
      <p className="text-on-surface-variant mb-8">{subtitle}</p>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <MetricCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} className="bg-surface-container-lowest" />
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() { const h = getHours(new Date()); if (h < 12) return 'morning'; if (h < 17) return 'afternoon'; return 'evening'; }
