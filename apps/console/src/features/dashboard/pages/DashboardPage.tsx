import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { api } from '../../../lib/api';
import { MetricCard, Input, exportToCSV, exportToPDF, formatCompactNumber, Modal, PrintableLetterhead } from '@citydenapartments/shared';
import { Building2, TrendingUp, Users, BedDouble, CalendarCheck, MapPin, ChevronDown, Coffee, Receipt, DollarSign, Download, FileText, Filter, Store, Printer } from 'lucide-react';
import { revenueApi } from '../../department-expenses/api/department-expenses.api';

const PERIODS = [
  { label: 'Today', value: 'daily' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
  { label: 'All Time', value: 'all' },
];

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface Summary {
  period?: { label: string; from: string | null; to: string | null };
  overview: {
    totalRevenue?: number;
    bookingRevenue?: number;
    departmentRevenue?: number;
    occupancyRate: number;
    totalRooms?: number;
    totalBookings?: number;
    activeUsers?: number;
    checkedInGuests: number;
    pendingCheckIns: number;
    todayArrivals: number;
  };
  departmentRevenueBreakdown?: {
    total: number;
    cash: number;
    pos: number;
    transfer: number;
    other: number;
    count: number;
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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchOpen, setBranchOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);

  // Timeline Filter State
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    api.get<{ items: Branch[] }>('/branches').then((res) => setBranches(res.items)).catch(() => {});
  }, []);

  const loadData = useCallback(async (period: string, from?: string, to?: string, branchId?: string) => {
    setLoading(true);
    setError('');
    try {
      const summaryParams = new URLSearchParams();
      if (branchId) summaryParams.set('branchId', branchId);
      if (from && to) {
        summaryParams.set('fromDate', from);
        summaryParams.set('toDate', to);
      } else if (period) {
        summaryParams.set('period', period);
      }

      const revParams: any = {};
      if (branchId) revParams.branchId = branchId;
      if (from && to) {
        revParams.fromDate = from;
        revParams.toDate = to;
      } else {
        revParams.period = period;
      }

      const [summaryRes, revRes] = await Promise.all([
        api.get<Summary>(`/dashboard/summary?${summaryParams.toString()}`),
        revenueApi.get(revParams),
      ]);

      setSummary(summaryRes);
      setRevenueData(revRes);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedPeriod, fromDate, toDate, selectedBranchId);
  }, [loadData, selectedPeriod, fromDate, toDate, selectedBranchId]);

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
        filename: 'revenue_overview',
        title: 'Revenue Overview Report',
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
    } finally {
      setExporting(null);
    }
  }, [revenueData]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={20} className="text-primary" />
      </div>
    );
  }

  if (error) return <div className="p-8 text-center text-error">{error}</div>;
  if (!summary) return null;

  const { overview = {} as Summary['overview'], byBranch, breakfast } = summary;
  const o = overview;
  const activeTimelineLabel = summary.period?.label || revenueData?.period?.label || 'Today';

  const stats = [
    { label: 'Gross Revenue', value: `₦${(o.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: '#10b981' },
    { label: 'Room Revenue', value: `₦${(o.bookingRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: '#3b82f6' },
    { label: 'Other Revenue (Depts)', value: `₦${(o.departmentRevenue ?? 0).toLocaleString()}`, icon: Store, color: '#8b5cf6' },
    { label: 'Occupancy', value: `${o.occupancyRate ?? 0}%`, icon: BedDouble, color: '#d4af37' },
    o.totalBookings !== undefined && { label: 'Total Bookings', value: o.totalBookings, icon: CalendarCheck, color: '#3b82f6' },
    { label: 'In-House Guests', value: o.checkedInGuests ?? 0, icon: Users, color: '#8b5cf6' },
    { label: 'Pending Check-ins', value: o.pendingCheckIns ?? 0, icon: CalendarCheck, color: '#f59e0b' },
    { label: "Today's Arrivals", value: o.todayArrivals ?? 0, icon: Building2, color: '#6366f1' },
    o.activeUsers !== undefined && { label: 'Active Staff', value: o.activeUsers, icon: Users, color: '#ec4899' },
    breakfast && { label: 'Breakfast', value: `${breakfast.served}/${breakfast.total}`, icon: Coffee, color: '#a855f7' },
  ].filter(Boolean) as Array<{ label: string; value: string | number; icon: any; color: string }>;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-px bg-primary" />
            <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {activeBranch ? `Overview for ${activeBranch.name}` : 'System-wide overview across all branches.'}
          </p>
        </div>

        {user?.role !== 'Reception' && (
          <div className="relative shrink-0" ref={branchRef}>
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

      {/* Global Dashboard Timeline Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-primary" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-on-surface">Dashboard Timeline Filter</span>
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
                    ? 'bg-surface-container-lowest text-primary shadow-sm border border-outline-variant/60'
                    : 'text-on-surface-variant hover:text-on-surface'
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

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <MetricCard key={s.label} icon={s.icon} label={s.label} value={s.value} color={s.color} className="!bg-surface-container-lowest" />
        ))}
      </div>

      {!selectedBranchId && byBranch && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl text-on-surface">By Branch Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {byBranch.map((b) => (
              <div key={b.branchId} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 hover:border-outline hover:shadow-ambient transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif text-lg text-on-surface">{b.name}</h3>
                  <span className="text-[10px] font-mono text-outline">{b.code}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-xs text-outline">Revenue</span><p className="font-medium">₦{formatCompactNumber(b.revenue)}</p></div>
                  <div><span className="text-xs text-outline">Occupancy</span><p className="font-medium">{b.occupancyRate}%</p></div>
                  <div><span className="text-xs text-outline">Rooms</span><p>{b.rooms} ({b.occupied} occupied)</p></div>
                  <div><span className="text-xs text-outline">Bookings</span><p>{b.bookings}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Overview & Revenue Breakdown */}
      <div className="space-y-6 pt-4 border-t border-outline-variant/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <DollarSign size={22} className="text-primary" />
            <div>
              <h2 className="font-serif text-xl sm:text-2xl text-on-surface">Financial & Department Revenue</h2>
              <p className="text-xs text-on-surface-variant">Combined sales analysis including Room Bookings and Department Revenue Logs.</p>
            </div>
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

        {/* Revenue Cards */}
        {revenueData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              icon={TrendingUp}
              label="Combined Gross Revenue"
              value={`₦${formatCompactNumber(revenueData.grossRevenue || revenueData.totalRevenue)}`}
              sub={`Room: ₦${formatCompactNumber(revenueData.bookingRevenue)} · Depts: ₦${formatCompactNumber(revenueData.departmentRevenue || 0)}`}
              color="#10b981"
              className="bg-surface-container-lowest border-emerald-500/20"
            />
            <MetricCard
              icon={CalendarCheck}
              label="Room Booking Revenue"
              value={`₦${formatCompactNumber(revenueData.bookingRevenue)}`}
              sub={`${revenueData.bookingCount} confirmed booking${revenueData.bookingCount !== 1 ? 's' : ''}`}
              color="#3b82f6"
              className="bg-surface-container-lowest"
            />
            <MetricCard
              icon={Store}
              label="Other Department Revenue"
              value={`₦${formatCompactNumber(revenueData.departmentRevenue || 0)}`}
              sub={`Bar, Laundry, Restaurant, Gym logs (${revenueData.departmentRevenueCount || 0} entries)`}
              color="#8b5cf6"
              className="bg-surface-container-lowest"
            />
            <MetricCard
              icon={Receipt}
              label="Department Expenses"
              value={`₦${formatCompactNumber(revenueData.departmentExpenses)}`}
              sub={`${revenueData.expenseCount} operational expense log${revenueData.expenseCount !== 1 ? 's' : ''}`}
              color="#f59e0b"
              className="bg-surface-container-lowest"
            />
            <MetricCard
              icon={DollarSign}
              label="Net Operating Revenue"
              value={`₦${formatCompactNumber(revenueData.netRevenue || (revenueData.bookingRevenue - revenueData.departmentExpenses))}`}
              sub={`Gross Sales minus Operational Expenses for ${activeTimelineLabel}`}
              color="#10b981"
              className="bg-surface-container-lowest"
            />
            <MetricCard
              icon={Receipt}
              label="VAT & Service Charge"
              value={`₦${formatCompactNumber(revenueData.vatCollected + revenueData.serviceChargeCollected)}`}
              sub={`VAT: ₦${formatCompactNumber(revenueData.vatCollected)} · SC: ₦${formatCompactNumber(revenueData.serviceChargeCollected)}`}
              color="#2563eb"
              className="bg-surface-container-lowest"
            />
          </div>
        )}
      </div>

      {/* Financial & Department Revenue Report Modal */}
      {revenueData && (
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Financial & Department Revenue Report"
          width={950}
        >
          <div className="py-2">
            <PrintableLetterhead
              title="FINANCIAL & DEPARTMENT REVENUE REPORT"
              subtitle={`Timeline: ${activeTimelineLabel} · ${activeBranch ? activeBranch.name : 'System-Wide (All Branches)'}`}
              date={fromDate && toDate ? `${fromDate} to ${toDate}` : undefined}
              metrics={[
                { label: 'Gross Revenue', value: `₦${(revenueData.grossRevenue || revenueData.totalRevenue).toLocaleString()}` },
                { label: 'Room Revenue', value: `₦${revenueData.bookingRevenue.toLocaleString()}` },
                { label: 'Department Sales', value: `₦${(revenueData.departmentRevenue || 0).toLocaleString()}` },
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
                  category: 'Combined Rooms + External Departments',
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
              notes="Financial & Department Revenue Audit Report compiled from City Den Apartments Management Platform."
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
