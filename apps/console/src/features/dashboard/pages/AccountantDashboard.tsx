import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/auth';
import { Spinner } from '../../../components/ui/Spinner';
import { api } from '../../../lib/api';
import { Input, Table } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import {
  TrendingUp, DollarSign, Receipt, CalendarCheck, CreditCard, Landmark,
} from 'lucide-react';
import { revenueApi } from '../../department-expenses/api/department-expenses.api';

const PERIODS = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Months', value: '3months' },
  { label: '6 Months', value: '6months' },
];

interface DailyRevenue {
  date: string;
  revenue: number;
  count: number;
}

interface AccountingData {
  revenue: {
    total: number;
    byPaymentMethod: { cash: number; pos_card: number; bank_transfer: number };
    today: number;
    thisMonth: number;
    averagePerBooking: number;
  };
  discounts: {
    totalGiven: number;
    averagePercentage: number;
    totalBookingsWithDiscount: number;
    thisMonth: { totalGiven: number; averagePercentage: number; bookingsWithDiscount: number };
  };
  bookings: {
    total: number;
    reserved: number;
    confirmed: number;
    checked_in: number;
    checked_out: number;
    cancelled: number;
  };
  inventory: {
    totalItems: number;
    totalValue: number;
    expiringItems: number;
  };
  dailyRevenue: DailyRevenue[];
}

interface RevenueData {
  period: { from: string; to: string; label: string | null };
  bookingRevenue: number;
  bookingCount: number;
  departmentExpenses: number;
  expenseCount: number;
  totalRevenue: number;
  vatCollected: number;
  serviceChargeCollected: number;
  vatCount: number;
  scCount: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  pos_card: 'POS/Card',
  bank_transfer: 'Bank Transfer',
};

const PAYMENT_ICONS: Record<string, any> = {
  cash: DollarSign,
  pos_card: CreditCard,
  bank_transfer: Landmark,
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#10b981',
  pos_card: '#3b82f6',
  bank_transfer: '#8b5cf6',
};

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [accounting, setAccounting] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [revenuePeriod, setRevenuePeriod] = useState('month');
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

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
  if (!accounting) return null;

  const { revenue, discounts, bookings, inventory, dailyRevenue } = accounting;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Financial Overview</span>
      </div>

      <div className="mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface mb-2">
          Welcome{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-on-surface-variant">Daily financial summary and performance metrics.</p>
      </div>

      {/* ── Today / Month Quick Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#10b98115' }}>
              <TrendingUp size={16} style={{ color: '#10b981' }} />
            </div>
            <span className="text-xs text-outline">Today's Revenue</span>
          </div>
          <p className="text-3xl font-bold text-on-surface">₦{revenue.today.toLocaleString()}</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#3b82f615' }}>
              <CalendarCheck size={16} style={{ color: '#3b82f6' }} />
            </div>
            <span className="text-xs text-outline">This Month</span>
          </div>
          <p className="text-3xl font-bold text-on-surface">₦{revenue.thisMonth.toLocaleString()}</p>
          <p className="text-[10px] text-outline mt-1">₦{revenue.averagePerBooking.toLocaleString()} avg/booking</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#f59e0b15' }}>
              <Receipt size={16} style={{ color: '#f59e0b' }} />
            </div>
            <span className="text-xs text-outline">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-on-surface">₦{revenue.total.toLocaleString()}</p>
          <p className="text-[10px] text-outline mt-1">{revenue.averagePerBooking > 0 ? `${bookings.total} bookings` : 'No bookings yet'}</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#ec489915' }}>
              <DollarSign size={16} style={{ color: '#ec4899' }} />
            </div>
            <span className="text-xs text-outline">Discounts Given</span>
          </div>
          <p className="text-3xl font-bold text-on-surface">₦{discounts.totalGiven.toLocaleString()}</p>
          <p className="text-[10px] text-outline mt-1">{discounts.totalBookingsWithDiscount} bookings · avg {discounts.averagePercentage}%</p>
        </div>
      </div>

      {/* ── Revenue by Payment Method ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-primary/60" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Revenue by Payment Method</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(revenue.byPaymentMethod).map(([method, amount]) => {
            const Icon = PAYMENT_ICONS[method] || DollarSign;
            const color = PAYMENT_COLORS[method] || '#6b7280';
            const pct = revenue.total > 0 ? ((amount / revenue.total) * 100).toFixed(1) : '0.0';
            return (
              <div key={method} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-xs text-outline">{PAYMENT_LABELS[method] || method}</span>
                </div>
                <p className="text-2xl font-bold text-on-surface">₦{amount.toLocaleString()}</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <p className="text-[10px] text-outline mt-1">{pct}% of total</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Daily Revenue (Last 14 Days) ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-primary/60" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Daily Revenue</span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          {(() => {
            const dailyColumns: TableProps<DailyRevenue>['columns'] = [
              {
                title: 'Date',
                dataIndex: 'date',
                key: 'date',
                render: (_, d) => new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
              },
              {
                title: 'Revenue',
                dataIndex: 'revenue',
                key: 'revenue',
                align: 'right',
                render: (_, d) => `₦${d.revenue.toLocaleString()}`,
              },
              {
                title: 'Bookings',
                dataIndex: 'count',
                key: 'count',
                align: 'right',
              },
              {
                title: 'Avg per Booking',
                key: 'avg',
                align: 'right',
                render: (_, d) => d.count > 0 ? `₦${Math.round(d.revenue / d.count).toLocaleString()}` : '-',
              },
            ];
            return (
              <Table<DailyRevenue>
                columns={dailyColumns}
                dataSource={[...dailyRevenue].reverse()}
                rowKey="date"
                pagination={false}
              />
            );
          })()}
        </div>
      </div>

      {/* ── Booking Status Breakdown ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-primary/60" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Booking Status</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Reserved', value: bookings.reserved, color: '#f59e0b' },
            { label: 'Confirmed', value: bookings.confirmed, color: '#3b82f6' },
            { label: 'Checked In', value: bookings.checked_in, color: '#10b981' },
            { label: 'Checked Out', value: bookings.checked_out, color: '#6b7280' },
            { label: 'Cancelled', value: bookings.cancelled, color: '#ef4444' },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 text-center">
              <span className="text-2xl font-bold text-on-surface">{s.value}</span>
              <p className="text-[10px] text-outline mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue Overview (Period Filter) ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-8 h-px bg-primary" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Revenue Analysis</span>
        </div>

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

        {revenueLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : revenueData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#d9770615' }}>
                  <Receipt size={16} style={{ color: '#d97706' }} />
                </div>
                <span className="text-xs text-outline">VAT Collected</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">₦{revenueData.vatCollected.toLocaleString()}</p>
              <p className="text-[10px] text-outline mt-1">{revenueData.vatCount} booking{revenueData.vatCount !== 1 ? 's' : ''} with VAT</p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: '#2563eb15' }}>
                  <Receipt size={16} style={{ color: '#2563eb' }} />
                </div>
                <span className="text-xs text-outline">Service Charge Collected</span>
              </div>
              <p className="text-3xl font-bold text-on-surface">₦{revenueData.serviceChargeCollected.toLocaleString()}</p>
              <p className="text-[10px] text-outline mt-1">{revenueData.scCount} booking{revenueData.scCount !== 1 ? 's' : ''} with Service Charge</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Inventory Overview ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-primary/60" />
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Inventory at a Glance</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
            <span className="text-xs text-outline">Total Items</span>
            <p className="text-2xl font-bold text-on-surface">{inventory.totalItems}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
            <span className="text-xs text-outline">Total Stock Value</span>
            <p className="text-2xl font-bold text-on-surface">₦{inventory.totalValue.toLocaleString()}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
            <span className="text-xs text-outline">Expiring Soon (30d)</span>
            <p className="text-2xl font-bold text-on-surface">{inventory.expiringItems}</p>
          </div>
        </div>
      </div>
    </div>
  );
}