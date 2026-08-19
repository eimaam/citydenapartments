import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, UtensilsCrossed } from 'lucide-react';
import { Button, Table } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { restaurantAdminApi } from '../api/restaurant-admin.api';
import type { RestaurantAnalyticsResponse } from '../api/restaurant-admin.api';

export default function RestaurantAnalyticsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<RestaurantAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await restaurantAdminApi.getAnalytics(
        undefined,
        startDate || undefined,
        endDate || undefined
      );
      setData(res);
    } catch {
      toast('error', 'Failed to load restaurant analytics.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const topDishColumns: TableProps<any>['columns'] = [
    {
      title: '#',
      key: 'rank',
      width: 60,
      render: (_: unknown, __: unknown, index: number) => (
        <span className="font-mono text-xs font-bold text-outline">{index + 1}</span>
      ),
    },
    {
      title: 'Dish / Item Name',
      dataIndex: '_id',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={14} className="text-primary" />
          <span className="font-semibold text-sm text-on-surface">{name || 'Special Dish'}</span>
        </div>
      ),
    },
    {
      title: 'Units Sold',
      dataIndex: 'totalQuantity',
      key: 'quantity',
      width: 120,
      render: (qty: number) => <span className="font-mono text-sm font-semibold">{qty} orders</span>,
    },
    {
      title: 'Revenue Generated',
      dataIndex: 'totalSales',
      key: 'revenue',
      width: 180,
      render: (rev: number) => (
        <span className="font-mono text-sm font-bold text-primary">
          ₦{rev?.toLocaleString() || 0}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Eyebrow Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
          Restaurant Performance
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">
          Dining & Sales Analytics
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-lowest text-on-surface rounded-md border border-outline-variant text-xs focus:outline-none focus:border-primary"
          />
          <span className="text-xs text-outline">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-lowest text-on-surface rounded-md border border-outline-variant text-xs focus:outline-none focus:border-primary"
          />
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
            onClick={() => fetchAnalytics()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Total Food Sales
          </span>
          <p className="text-2xl font-serif font-bold text-on-surface mt-1">
            ₦{(data?.overall?.totalRevenue || 0).toLocaleString()}
          </p>
          <span className="text-[11px] text-outline mt-1 block">Paid and fulfilled orders</span>
        </div>

        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            Completed Orders
          </span>
          <p className="text-2xl font-serif font-bold text-on-surface mt-1">
            {data?.overall?.completedOrders || 0}
          </p>
          <span className="text-[11px] text-outline mt-1 block">
            {(data?.overall?.totalOrders || 0)} total orders placed
          </span>
        </div>

        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            In-House Room Deliveries
          </span>
          <p className="text-2xl font-serif font-bold text-on-surface mt-1">
            {data?.overall?.inRoomOrders || 0}
          </p>
          <span className="text-[11px] text-outline mt-1 block">₦0 complimentary room service</span>
        </div>

        <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="text-xs font-bold uppercase tracking-wider text-outline">
            External Deliveries
          </span>
          <p className="text-2xl font-serif font-bold text-on-surface mt-1">
            {data?.overall?.homeDeliveryOrders || 0}
          </p>
          <span className="text-[11px] text-outline mt-1 block">Fixed-fee dispatch zones</span>
        </div>
      </div>

      {/* Leaderboard Table Shell */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-on-surface">Top Selling Dishes</h2>
          <span className="text-xs text-outline font-medium">Ranked by volume ordered</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <Table
            columns={topDishColumns}
            dataSource={data?.topItems || []}
            rowKey={(r: any) => r._id}
            loading={loading}
            pagination={false}
          />
        </div>
      </div>
    </div>
  );
}
