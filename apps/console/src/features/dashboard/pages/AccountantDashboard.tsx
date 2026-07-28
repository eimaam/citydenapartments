import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { api } from '../../../lib/api';
import { MetricCard, Input, Table, exportToCSV, exportToPDF, formatCompactNumber } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import {
  TrendingUp, DollarSign, Receipt, CalendarCheck, CreditCard, Landmark,
  Download, FileText, Filter, ChevronDown,
} from 'lucide-react';
import { revenueApi } from '../../department-expenses/api/department-expenses.api';

const PERIODS = [
  { label: 'Daily', value: 'daily' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
] as const;

interface DailyRevenue { date: string; revenue: number; count: number }

interface AccountingData {
  revenue: { total: number; byPaymentMethod: { cash: number; pos_card: number; bank_transfer: number }; today: number; thisMonth: number; averagePerBooking: number };
  discounts: { totalGiven: number; averagePercentage: number; totalBookingsWithDiscount: number; thisMonth: { totalGiven: number; averagePercentage: number; bookingsWithDiscount: number } };
  bookings: { total: number; reserved: number; confirmed: number; checked_in: number; checked_out: number; cancelled: number };
  inventory: { totalItems: number; totalValue: number; expiringItems: number };
  dailyRevenue: DailyRevenue[];
}

interface RevenueData {
  period: { from: string; to: string; label: string | null };
  bookingRevenue: number; bookingCount: number; departmentExpenses: number; expenseCount: number;
  totalRevenue: number; vatCollected: number; serviceChargeCollected: number; vatCount: number; scCount: number;
}

const PAYMENT_META: Record<string, { label: string; icon: any; color: string }> = {
  cash: { label: 'Cash', icon: DollarSign, color: '#10b981' },
  pos_card: { label: 'POS / Card', icon: CreditCard, color: '#3b82f6' },
  bank_transfer: { label: 'Bank Transfer', icon: Landmark, color: '#8b5cf6' },
};

const BOOKING_STATUSES = [
  { label: 'Reserved', color: '#f59e0b' },
  { label: 'Confirmed', color: '#3b82f6' },
  { label: 'Checked In', color: '#10b981' },
  { label: 'Checked Out', color: '#6b7280' },
  { label: 'Cancelled', color: '#ef4444' },
];

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [accounting, setAccounting] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [revenuePeriod, setRevenuePeriod] = useState('daily');
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<AccountingData>('/dashboard/accounting')
      .then(setAccounting)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fetchRevenue = async (period: string, from?: string, to?: string) => {
    setRevenueLoading(true);
    try {
      const params: any = {};
      if (from && to) { params.fromDate = from; params.toDate = to; }
      else { params.period = period; }
      const data = await revenueApi.get(params);
      setRevenueData(data);
    } catch { /* ignore */ }
    finally { setRevenueLoading(false); }
  };

  useEffect(() => { fetchRevenue('daily'); }, []);

  const onPeriodClick = (period: string) => {
    setRevenuePeriod(period);
    setRevFromDate(''); setRevToDate('');
    fetchRevenue(period);
  };
  const onDateRangeApply = () => {
    if (revFromDate && revToDate) { setRevenuePeriod(''); fetchRevenue('', revFromDate, revToDate); }
  };

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
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
          { metric: 'Expense Count', value: revenueData.expenseCount },
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

  const handleDailyExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!accounting) return;
    setExporting(format);
    try {
      const opts = {
        filename: 'daily_revenue',
        title: 'Daily Revenue Report',
        columns: [
          { title: 'Date', dataIndex: 'date' as const },
          { title: 'Revenue', dataIndex: 'revenue' as const, render: (v: number) => `₦${v.toLocaleString()}` },
          { title: 'Bookings', dataIndex: 'count' as const },
          { title: 'Avg per Booking', key: 'avg' as const, render: (_: any, d: DailyRevenue) => d.count > 0 ? `₦${Math.round(d.revenue / d.count).toLocaleString()}` : '-' },
        ],
        data: [...accounting.dailyRevenue].reverse(),
      };
      if (format === 'csv') exportToCSV(opts);
      else exportToPDF(opts);
    } finally { setExporting(null); }
  }, [accounting]);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>;
  if (error) return <div className="p-8 text-center text-error">{error}</div>;
  if (!accounting) return null;

  const { revenue, discounts, bookings, inventory, dailyRevenue } = accounting;

  return (
    <div className="p-6 md:p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-[2px] rounded-full bg-primary" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary/50">Financial Dashboard</span>
          </div>
          <h1 className="font-serif text-3xl text-on-surface tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-sm text-secondary/70 mt-1">Real-time financial summary for your branch</p>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={TrendingUp} label="Today's Revenue" value={`₦${formatCompactNumber(revenue.today)}`} color="#10b981" className="bg-white" />
        <MetricCard icon={CalendarCheck} label="This Month" value={`₦${formatCompactNumber(revenue.thisMonth)}`} sub={`₦${formatCompactNumber(revenue.averagePerBooking)} avg/booking`} color="#3b82f6" className="bg-white" />
        <MetricCard icon={Receipt} label="Total Revenue" value={`₦${formatCompactNumber(revenue.total)}`} sub={`${bookings.total} bookings`} color="#f59e0b" className="bg-white" />
        <MetricCard icon={DollarSign} label="Discounts Given" value={`₦${formatCompactNumber(discounts.totalGiven)}`} sub={`${discounts.totalBookingsWithDiscount} bookings · avg ${discounts.averagePercentage}%`} color="#ec4899" className="bg-white" />
      </div>

      {/* ── Revenue by Payment ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Revenue by Payment Method</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(revenue.byPaymentMethod).map(([method, amount]) => {
            const m = PAYMENT_META[method] || { label: method, icon: DollarSign, color: '#6b7280' };
            const Icon = m.icon;
            const pct = revenue.total > 0 ? ((amount / revenue.total) * 100).toFixed(1) : '0.0';
            return (
              <div key={method} className="bg-white border border-outline-variant/40 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${m.color}12` }}>
                    <Icon size={16} style={{ color: m.color }} />
                  </div>
                  <span className="text-xs font-medium text-secondary/70">{m.label}</span>
                </div>
                <p className="text-2xl font-bold text-on-surface tracking-tight">₦{formatCompactNumber(amount)}</p>
                <div className="mt-3 h-2 w-full rounded-full bg-surface-container">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: m.color }} />
                </div>
                <p className="text-[11px] text-secondary/60 mt-1.5">{pct}% of total revenue</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Daily Revenue Table ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Daily Revenue Trend</h2>
          <span className="text-[10px] text-secondary/50 ml-1">Last 14 days</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => handleDailyExport('csv')} disabled={exporting !== null} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-variant/50 text-[11px] font-medium text-secondary/80 hover:text-on-surface hover:border-outline transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white">
              {exporting === 'csv' ? <Spinner size={12} className="text-primary" /> : <FileText size={13} />}
              CSV
            </button>
            <button onClick={() => handleDailyExport('pdf')} disabled={exporting !== null} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-variant/50 text-[11px] font-medium text-secondary/80 hover:text-on-surface hover:border-outline transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white">
              {exporting === 'pdf' ? <Spinner size={12} className="text-primary" /> : <Download size={13} />}
              PDF
            </button>
          </div>
        </div>
        <div className="bg-white border border-outline-variant/40 rounded-xl overflow-hidden">
          {(() => {
            const dailyCols: TableProps<DailyRevenue>['columns'] = [
              { title: 'Date', dataIndex: 'date', render: (_, d) => new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) },
              { title: 'Revenue', dataIndex: 'revenue', align: 'right', render: (_, d) => <span className="font-medium">₦{d.revenue.toLocaleString()}</span> },
              { title: 'Bookings', dataIndex: 'count', align: 'right' },
              { title: 'Avg / Booking', key: 'avg', align: 'right', render: (_, d) => d.count > 0 ? `₦${Math.round(d.revenue / d.count).toLocaleString()}` : '-' },
            ];
            return <Table<DailyRevenue> columns={dailyCols} dataSource={[...dailyRevenue].reverse()} rowKey="date" pagination={false} />;
          })()}
        </div>
      </section>

      {/* ── Booking Status ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Booking Status</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {BOOKING_STATUSES.map((s) => (
            <div key={s.label} className="bg-white border border-outline-variant/40 rounded-xl p-5 text-center">
              <p className="text-[28px] font-bold text-on-surface tracking-tight">{(bookings as any)[s.label.toLowerCase().replace(/ /g, '_')]}</p>
              <p className="text-[10px] font-medium text-secondary/60 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Revenue Analysis ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Revenue Analysis</h2>
          {revenueData && (
            <div className="ml-auto flex gap-2">
              <button onClick={() => handleExport('csv')} disabled={exporting !== null} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-variant/50 text-[11px] font-medium text-secondary/80 hover:text-on-surface hover:border-outline transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white">
                {exporting === 'csv' ? <Spinner size={12} className="text-primary" /> : <FileText size={13} />}
                CSV
              </button>
              <button onClick={() => handleExport('pdf')} disabled={exporting !== null} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-variant/50 text-[11px] font-medium text-secondary/80 hover:text-on-surface hover:border-outline transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white">
                {exporting === 'pdf' ? <Spinner size={12} className="text-primary" /> : <Download size={13} />}
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-surface-container/60 border border-outline-variant/30 rounded-xl">
          <Filter size={14} className="text-secondary/50" />
          <div className="flex gap-1 p-0.5 rounded-lg bg-white border border-outline-variant/30">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => onPeriodClick(p.value)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                  revenuePeriod === p.value
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-secondary/70 hover:text-on-surface bg-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="w-px h-5 bg-outline-variant/50" />
          <div className="flex items-center gap-2">
            <Input type="date" size="sm" value={revFromDate} onChange={(e) => setRevFromDate(e.target.value)} className="!w-32" />
            <span className="text-[11px] text-secondary/50">—</span>
            <Input type="date" size="sm" value={revToDate} onChange={(e) => setRevToDate(e.target.value)} className="!w-32" />
            <button
              onClick={onDateRangeApply}
              disabled={!revFromDate || !revToDate}
              className="h-8 px-3 text-[11px] font-medium rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border-none"
            >
              Apply
            </button>
          </div>
        </div>

        {revenueLoading ? (
          <div className="flex items-center justify-center py-16 bg-white border border-outline-variant/40 rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-secondary/60">Loading revenue data...</span>
            </div>
          </div>
        ) : revenueData ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Revenue', value: `₦${formatCompactNumber(revenueData.totalRevenue)}`, color: '#10b981' },
              { label: 'Booking Revenue', value: `₦${formatCompactNumber(revenueData.bookingRevenue)}`, color: '#3b82f6' },
              { label: 'Expenses', value: `₦${formatCompactNumber(revenueData.departmentExpenses)}`, color: '#f59e0b' },
              { label: 'Net Revenue', value: `₦${formatCompactNumber(revenueData.bookingRevenue - revenueData.departmentExpenses)}`, color: '#8b5cf6' },
              { label: 'VAT Collected', value: `₦${formatCompactNumber(revenueData.vatCollected)}`, color: '#d97706' },
              { label: 'Service Charge', value: `₦${formatCompactNumber(revenueData.serviceChargeCollected)}`, color: '#2563eb' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-outline-variant/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                  <span className="text-[10px] font-medium text-secondary/70 uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-lg font-bold text-on-surface tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── Inventory ── */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Inventory at a Glance</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white border border-outline-variant/40 rounded-xl p-5">
            <span className="text-[11px] font-medium text-secondary/70 uppercase tracking-wider">Total Items</span>
            <p className="text-2xl font-bold text-on-surface tracking-tight mt-2">{inventory.totalItems}</p>
          </div>
          <div className="bg-white border border-outline-variant/40 rounded-xl p-5">
            <span className="text-[11px] font-medium text-secondary/70 uppercase tracking-wider">Stock Value</span>
            <p className="text-2xl font-bold text-on-surface tracking-tight mt-2">₦{formatCompactNumber(inventory.totalValue)}</p>
          </div>
          <div className="bg-white border border-outline-variant/40 rounded-xl p-5">
            <span className="text-[11px] font-medium text-secondary/70 uppercase tracking-wider">Expiring Soon</span>
            <p className="text-2xl font-bold text-on-surface tracking-tight mt-2">{inventory.expiringItems}</p>
            <p className="text-[10px] text-secondary/50 mt-1">Within 30 days</p>
          </div>
        </div>
      </section>

    </div>
  );
}