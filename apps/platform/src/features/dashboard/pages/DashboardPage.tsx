import { format, getHours } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/auth';
import { can } from '../../../components/ui/Can';
import { Spinner } from '../../../components/ui/Spinner';
import { UserRole } from '@citydenapartments/shared';
import { dashboardApi, type DashboardSummary, type AccountingSummary } from '../api/dashboard.api';
import { CalendarCheck, Users, Coffee, Clock, TrendingUp, DollarSign, PieChart, Receipt, Banknote, CreditCard, Landmark, Package, Download, FileText, Filter, Store, Printer } from 'lucide-react';
import { MetricCard, exportToCSV, exportToPDF, Input, Table, formatCompactNumber, Modal, PrintableLetterhead } from '@citydenapartments/shared';
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
        filename: 'kitchen_summary',
        title: 'Kitchen Breakfast Summary',
        columns: [
          { title: 'Metric', dataIndex: 'label' as const },
          { title: 'Value', dataIndex: 'value' as const },
        ],
        data: [
          { label: 'Total Guests', value: data.breakfast.total },
          { label: 'Served', value: data.breakfast.served },
          { label: 'Pending', value: data.breakfast.pending },
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
  { label: 'Today', value: 'daily' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
  { label: 'All Time', value: 'all' },
];

function AccountantDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  // Timeline Filter State
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [revenueData, setRevenueData] = useState<any>(null);
  const [showRevenueReportModal, setShowRevenueReportModal] = useState(false);
  const [overviewSummary, setOverviewSummary] = useState<DashboardSummary | null>(null);

  const loadData = useCallback(async (period: string, from?: string, to?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (from && to) {
        params.fromDate = from;
        params.toDate = to;
      } else {
        params.period = period;
      }

      const [acctRes, revRes, summaryRes] = await Promise.all([
        dashboardApi.accounting(params),
        dashboardApi.revenue(params),
        dashboardApi.summary().catch(() => null),
      ]);

      setData(acctRes);
      setRevenueData(revRes);
      if (summaryRes) setOverviewSummary(summaryRes);
    } catch {
      // quiet catch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedPeriod, fromDate, toDate);
  }, [loadData, selectedPeriod, fromDate, toDate, user?.activeBranchId]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setFromDate('');
    setToDate('');
  };

  const handleDateRangeApply = () => {
    if (fromDate && toDate) {
      setSelectedPeriod('');
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
          { metric: 'Gross Revenue (Total)', value: `₦${(revenueData.grossRevenue || revenueData.totalRevenue).toLocaleString()}` },
          { metric: 'Room Booking Revenue', value: `₦${revenueData.bookingRevenue.toLocaleString()}` },
          { metric: 'Booking Count', value: revenueData.bookingCount },
          { metric: 'Department Revenue (Other Sales)', value: `₦${(revenueData.departmentRevenue || 0).toLocaleString()}` },
          { metric: 'Department Expenses', value: `₦${revenueData.departmentExpenses.toLocaleString()}` },
          { metric: 'Net Revenue', value: `₦${(revenueData.netRevenue || (revenueData.bookingRevenue - revenueData.departmentExpenses)).toLocaleString()}` },
          { metric: 'VAT Collected', value: `₦${revenueData.vatCollected.toLocaleString()}` },
          { metric: 'Service Charge Collected', value: `₦${revenueData.serviceChargeCollected.toLocaleString()}` },
          { metric: 'Timeline', value: revenueData.period?.label || 'Custom' },
        ],
      };
      if (format === 'csv') exportToCSV(opts);
      else exportToPDF(opts);
    } finally { setExporting(null); }
  }, [revenueData]);

  if (loading && !data) {
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
  const activeTimelineLabel = data.period?.label || revenueData?.period?.label || 'Today';

  const paymentIcon = (method: string) => {
    if (method === 'cash') return Banknote;
    if (method === 'pos_card') return CreditCard;
    if (method === 'bank_transfer') return Landmark;
    return Store;
  };

  const paymentLabel = (method: string) => {
    if (method === 'cash') return 'Cash';
    if (method === 'pos_card') return 'POS / Card';
    if (method === 'bank_transfer') return 'Bank Transfer';
    return 'Other Sales';
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-primary" />
            <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Management Overview</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-on-surface mb-2">Operations & Financial Overview</h1>
          <p className="text-on-surface-variant text-sm">Real-time occupancy, revenue metrics, department sales, and expenses breakdown for {user?.activeBranchId ? 'your branch' : 'all branches'}.</p>
        </div>
      </div>

      {/* Operational Summary Banner (Arrivals, In-House, Pending, Occupancy) */}
      {overviewSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Arrivals", value: overviewSummary.overview.todayArrivals, icon: CalendarCheck, color: '#d4af37' },
            { label: 'Currently In-House', value: overviewSummary.overview.checkedInGuests, icon: Users, color: '#3b82f6' },
            { label: 'Pending Check-ins', value: overviewSummary.overview.pendingCheckIns, icon: Clock, color: '#f59e0b' },
            { label: 'Occupancy Rate', value: `${overviewSummary.overview.occupancyRate}%`, icon: TrendingUp, color: '#10b981' },
          ].map((stat) => (
            <MetricCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} className="bg-surface-container-lowest" />
          ))}
        </div>
      )}

      {/* Global Timeline Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface">Financial Timeline Filter</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <CalendarCheck size={13} />
            <span>Viewing: {activeTimelineLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant/40">
            {ACCT_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedPeriod === p.value
                    ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/60'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="gap-2">
            <span className="text-xs text-outline font-medium">Custom Range:</span>
            <div className="flex items-center gap-2">
            <Input type="date" size="sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="!w-36 text-xs" />
            <span className="text-xs text-outline">—</span>
            <Input type="date" size="sm" value={toDate} onChange={(e) => setToDate(e.target.value)} className="!w-36 text-xs" />
            <button
              onClick={handleDateRangeApply}
              disabled={!fromDate || !toDate}
              className="px-3 py-1.5 text-xs font-bold rounded bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
            >
              Apply Filter
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Gross Revenue', value: `₦${formatCompactNumber(r.total)}`, icon: TrendingUp, color: '#10b981' },
          { label: 'Room Revenue', value: `₦${formatCompactNumber(r.roomBookingRevenue || 0)}`, icon: DollarSign, color: '#3b82f6' },
          { label: 'Other Revenue (Depts)', value: `₦${formatCompactNumber(r.departmentRevenue?.total || 0)}`, icon: Store, color: '#8b5cf6' },
          { label: 'Avg / Booking', value: `₦${formatCompactNumber(r.averagePerBooking)}`, icon: PieChart, color: '#f59e0b' },
        ].map((stat) => (
          <MetricCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} color={stat.color} className="bg-surface-container-lowest" />
        ))}
      </div>

      {/* Payment Method Breakdown + Discounts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Revenue by Payment Method ({activeTimelineLabel})</h2>
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
                    <p className="text-[10px] text-outline">{pct}% of gross</p>
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
              <p className="text-[10px] text-outline uppercase tracking-wide">For Selected Timeline ({activeTimelineLabel})</p>
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
              <p className="text-[10px] text-outline uppercase tracking-wide">This Month Summary</p>
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
            <h2 className="text-sm font-semibold text-on-surface">Daily Revenue Trend</h2>
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

      {/* Revenue & Expenses Analysis */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Revenue & Financial Analysis ({activeTimelineLabel})</h2>
          {revenueData && (
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => handleRevenueExport('csv')}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-outline-variant text-outline hover:text-on-surface hover:border-outline transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent"
              >
                {exporting === 'csv' ? <Spinner size={10} /> : <FileText size={11} />} CSV Export
              </button>
              <button
                onClick={() => setShowRevenueReportModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all cursor-pointer shadow-sm"
              >
                <Printer size={11} /> Financial Report
              </button>
            </div>
          )}
        </div>

        {revenueData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Gross Revenue', value: `₦${formatCompactNumber(revenueData.grossRevenue || revenueData.totalRevenue)}`, color: '#10b981' },
              { label: 'Room Revenue', value: `₦${formatCompactNumber(revenueData.bookingRevenue)}`, color: '#3b82f6' },
              { label: 'Other Sales (Depts)', value: `₦${formatCompactNumber(revenueData.departmentRevenue || 0)}`, color: '#8b5cf6' },
              { label: 'Department Expenses', value: `₦${formatCompactNumber(revenueData.departmentExpenses)}`, color: '#f59e0b' },
              { label: 'Net Revenue', value: `₦${formatCompactNumber(revenueData.netRevenue || (revenueData.bookingRevenue - revenueData.departmentExpenses))}`, color: '#10b981' },
              { label: 'VAT & SC', value: `₦${formatCompactNumber(revenueData.vatCollected + revenueData.serviceChargeCollected)}`, color: '#2563eb' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container p-3 rounded">
                <span className="text-[10px] text-outline">{stat.label}</span>
                <p className="text-lg font-bold text-on-surface">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Printable Revenue & Financial Analysis Report Modal */}
      {revenueData && (
        <Modal
          isOpen={showRevenueReportModal}
          onClose={() => setShowRevenueReportModal(false)}
          title="Financial & Revenue Report"
          width={950}
        >
          <div className="py-2">
            <PrintableLetterhead
              title="FINANCIAL & REVENUE REPORT"
              subtitle={`Timeline: ${activeTimelineLabel} · ${user?.activeBranchId ? 'Active Branch' : 'All Branches'}`}
              date={fromDate && toDate ? `${fromDate} to ${toDate}` : undefined}
              metrics={[
                { label: 'Gross Revenue', value: `₦${(revenueData.grossRevenue || revenueData.totalRevenue).toLocaleString()}` },
                { label: 'Room Revenue', value: `₦${revenueData.bookingRevenue.toLocaleString()}` },
                { label: 'Other Sales', value: `₦${(revenueData.departmentRevenue || 0).toLocaleString()}` },
                { label: 'Net Revenue', value: `₦${(revenueData.netRevenue || (revenueData.bookingRevenue - revenueData.departmentExpenses)).toLocaleString()}` },
              ]}
              columns={[
                { title: 'Financial Metric / Revenue Stream', key: 'metric' },
                { title: 'Category / Operational Details', key: 'category' },
                { title: 'Amount (₦)', key: 'amount', align: 'right' },
              ]}
              data={[
                {
                  metric: 'Gross Revenue (Total Sales)',
                  category: 'Combined Room Bookings + External Departments',
                  amount: `₦${(revenueData.grossRevenue || revenueData.totalRevenue).toLocaleString()}`,
                },
                {
                  metric: 'Room Booking Revenue',
                  category: `${revenueData.bookingCount} Confirmed Booking(s)`,
                  amount: `₦${revenueData.bookingRevenue.toLocaleString()}`,
                },
                {
                  metric: 'Other Department Sales',
                  category: 'Bar, Laundry, Restaurant, Gym External Logs',
                  amount: `₦${(revenueData.departmentRevenue || 0).toLocaleString()}`,
                },
                {
                  metric: 'Department Expenses',
                  category: 'Operational Expenses Billed',
                  amount: `₦${revenueData.departmentExpenses.toLocaleString()}`,
                },
                {
                  metric: 'VAT (7.5%) Tax Collected',
                  category: 'Statutory Value Added Tax',
                  amount: `₦${revenueData.vatCollected.toLocaleString()}`,
                },
                {
                  metric: 'Service Charge (10%) Collected',
                  category: 'Property Operations Charge',
                  amount: `₦${revenueData.serviceChargeCollected.toLocaleString()}`,
                },
              ]}
              totalsRow={{
                metric: 'NET OPERATING REVENUE',
                category: 'Gross Revenue minus Operational Expenses',
                amount: `₦${(revenueData.netRevenue || (revenueData.bookingRevenue - revenueData.departmentExpenses)).toLocaleString()}`,
              }}
              notes="Financial & Revenue Audit Report generated from City Den Apartments Operations Platform."
            />
          </div>
        </Modal>
      )}
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
