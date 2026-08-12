import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { api } from '../../../lib/api';
import { MetricCard, Input, Table, exportToCSV, exportToPDF, formatCompactNumber, Modal, PrintableLetterhead } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import {
  TrendingUp, DollarSign, Receipt, CalendarCheck, CreditCard, Landmark,
  Download, FileText, Filter, Store, Printer,
} from 'lucide-react';
import { revenueApi } from '../../department-expenses/api/department-expenses.api';

const PERIODS = [
  { label: 'Today', value: 'daily' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
  { label: 'All Time', value: 'all' },
] as const;

interface DailyRevenue { date: string; revenue: number; count: number }

interface AccountingData {
  period?: { label: string; from: string | null; to: string | null };
  revenue: {
    total: number;
    roomBookingRevenue?: number;
    byPaymentMethod: { cash: number; pos_card: number; bank_transfer: number; other?: number };
    today: number;
    thisMonth: number;
    averagePerBooking: number;
    departmentRevenue?: { total: number; cash: number; pos: number; transfer: number; other: number; count: number };
    combinedGrossRevenue?: number;
  };
  discounts: { totalGiven: number; averagePercentage: number; totalBookingsWithDiscount: number; thisMonth: { totalGiven: number; averagePercentage: number; bookingsWithDiscount: number } };
  bookings: { total: number; reserved: number; confirmed: number; checked_in: number; checked_out: number; cancelled: number };
  inventory: { totalItems: number; totalValue: number; expiringItems: number };
  dailyRevenue: DailyRevenue[];
}

interface RevenueData {
  period: { from: string | null; to: string | null; label: string };
  bookingRevenue: number;
  bookingCount: number;
  departmentRevenue: number;
  departmentRevenueCount: number;
  departmentRevenueBreakdown: { cash: number; pos: number; transfer: number; other: number };
  departmentExpenses: number;
  expenseCount: number;
  vatCollected: number;
  serviceChargeCollected: number;
  vatCount: number;
  scCount: number;
  grossRevenue: number;
  netRevenue: number;
  totalRevenue: number;
}

const PAYMENT_META: Record<string, { label: string; icon: any; color: string }> = {
  cash: { label: 'Cash', icon: DollarSign, color: '#10b981' },
  pos_card: { label: 'POS / Card', icon: CreditCard, color: '#3b82f6' },
  bank_transfer: { label: 'Bank Transfer', icon: Landmark, color: '#8b5cf6' },
  other: { label: 'Other Methods', icon: Store, color: '#f59e0b' },
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

  // Timeline Filter State
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const loadData = useCallback(async (period: string, from?: string, to?: string) => {
    setLoading(true);
    setError('');
    try {
      const acctParams = new URLSearchParams();
      if (from && to) {
        acctParams.set('fromDate', from);
        acctParams.set('toDate', to);
      } else if (period) {
        acctParams.set('period', period);
      }

      const revParams: any = {};
      if (from && to) {
        revParams.fromDate = from;
        revParams.toDate = to;
      } else {
        revParams.period = period;
      }

      const [acctRes, revRes] = await Promise.all([
        api.get<AccountingData>(`/dashboard/accounting?${acctParams.toString()}`),
        revenueApi.get(revParams),
      ]);

      setAccounting(acctRes);
      setRevenueData(revRes);
    } catch (e: any) {
      setError(e.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedPeriod, fromDate, toDate);
  }, [loadData, selectedPeriod, fromDate, toDate]);

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
          { metric: 'Gross Revenue (Total)', value: `₦${(revenueData.grossRevenue || revenueData.totalRevenue).toLocaleString()}` },
          { metric: 'Room Booking Revenue', value: `₦${revenueData.bookingRevenue.toLocaleString()}` },
          { metric: 'Booking Count', value: revenueData.bookingCount },
          { metric: 'Department Revenue (Other Sales)', value: `₦${(revenueData.departmentRevenue || 0).toLocaleString()}` },
          { metric: 'Department Expenses', value: `₦${revenueData.departmentExpenses.toLocaleString()}` },
          { metric: 'Expense Count', value: revenueData.expenseCount },
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

  if (loading && !accounting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={20} className="text-primary" />
      </div>
    );
  }

  if (error) return <div className="p-8 text-center text-error">{error}</div>;
  if (!accounting) return null;

  const { revenue, discounts, bookings, inventory, dailyRevenue } = accounting;
  const activeTimelineLabel = accounting.period?.label || revenueData?.period?.label || 'Today';

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-[2px] rounded-full bg-primary" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-secondary/50">Financial Dashboard</span>
          </div>
          <h1 className="font-serif text-3xl text-on-surface tracking-tight">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-sm text-secondary/70 mt-1">Real-time financial summary & department revenues for your branch</p>
        </div>
      </div>

      {/* Global Dashboard Timeline Filter Bar */}
      <div className="bg-white border border-outline-variant/40 p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
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
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  selectedPeriod === p.value
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-secondary/70 hover:text-on-surface bg-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-outline font-medium">Custom Range:</span>
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

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={TrendingUp} label="Gross Combined Revenue" value={`₦${formatCompactNumber(revenue.total)}`} sub={`For ${activeTimelineLabel}`} color="#10b981" className="bg-white border-emerald-500/20" />
        <MetricCard icon={CalendarCheck} label="Room Booking Revenue" value={`₦${formatCompactNumber(revenue.roomBookingRevenue || 0)}`} sub={`${bookings.total} bookings`} color="#3b82f6" className="bg-white" />
        <MetricCard icon={Store} label="Other Department Revenue" value={`₦${formatCompactNumber(revenue.departmentRevenue?.total || 0)}`} sub={`Bar, Laundry, Restaurant, Gym`} color="#8b5cf6" className="bg-white" />
        <MetricCard icon={DollarSign} label="Discounts Given" value={`₦${formatCompactNumber(discounts.totalGiven)}`} sub={`${discounts.totalBookingsWithDiscount} bookings · avg ${discounts.averagePercentage}%`} color="#ec4899" className="bg-white" />
      </div>

      {/* Revenue by Payment Method */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Payment Method Breakdown ({activeTimelineLabel})</h2>
        </div>
        <div className="grid sm:grid-cols-4 gap-4">
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
                <p className="text-[11px] text-secondary/60 mt-1.5">{pct}% of gross revenue</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Revenue & Expenses Analysis */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Revenue & Profitability Overview ({activeTimelineLabel})</h2>
          </div>
          {revenueData && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting !== null}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-variant/50 text-[11px] font-medium text-secondary/80 hover:text-on-surface hover:border-outline transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                {exporting === 'csv' ? <Spinner size={12} className="text-primary" /> : <FileText size={13} />}
                CSV Export
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary/40 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary hover:text-on-primary transition-all cursor-pointer shadow-sm"
              >
                <Printer size={13} />
                Financial Report
              </button>
            </div>
          )}
        </div>

        {revenueData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Gross Revenue', value: `₦${formatCompactNumber(revenueData.grossRevenue || revenueData.totalRevenue)}`, color: '#10b981' },
              { label: 'Room Revenue', value: `₦${formatCompactNumber(revenueData.bookingRevenue)}`, color: '#3b82f6' },
              { label: 'Other Sales (Depts)', value: `₦${formatCompactNumber(revenueData.departmentRevenue || 0)}`, color: '#8b5cf6' },
              { label: 'Expenses', value: `₦${formatCompactNumber(revenueData.departmentExpenses)}`, color: '#f59e0b' },
              { label: 'Net Operating Income', value: `₦${formatCompactNumber(revenueData.netRevenue || (revenueData.bookingRevenue - revenueData.departmentExpenses))}`, color: '#10b981' },
              { label: 'VAT & SC Tax', value: `₦${formatCompactNumber(revenueData.vatCollected + revenueData.serviceChargeCollected)}`, color: '#2563eb' },
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
        )}
      </section>

      {/* Daily Revenue Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Daily Revenue Trend</h2>
            <span className="text-[10px] text-secondary/50 ml-1">Recent 14 days</span>
          </div>
          <div className="flex gap-2">
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

      {/* Booking Status Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-sm font-semibold text-on-surface">Booking Status Overview</h2>
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

      {/* Inventory Glance */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
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

      {/* Financial & Revenue Report Modal */}
      {revenueData && (
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Financial & Revenue Report"
          width={950}
        >
          <div className="py-2">
            <PrintableLetterhead
              title="FINANCIAL & REVENUE REPORT"
              subtitle={`Timeline: ${activeTimelineLabel} · Branch Financial Audit`}
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
                  category: `Bar, Laundry, Restaurant, Gym (${revenueData.departmentRevenueCount || 0} Logs)`,
                  amount: `₦${(revenueData.departmentRevenue || 0).toLocaleString()}`,
                },
                {
                  metric: 'Department Expenses',
                  category: `${revenueData.expenseCount || 0} Operational Expense Log(s)`,
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