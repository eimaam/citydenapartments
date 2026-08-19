import { useState, useEffect, useCallback } from 'react';
import { UtensilsCrossed, Search, RefreshCw } from 'lucide-react';
import {
  Button,
  Input,
  Badge,
  Table,
  RoomStatus,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type { MenuItemResponse } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { restaurantOrdersApi } from '../api/restaurant-orders.api';

export default function MenuAvailabilityPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await restaurantOrdersApi.getMenuItems({ search: search.trim() || undefined });
      setItems(res.items || []);
    } catch {
      toast('error', 'Failed to load menu items.');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleToggle = async (item: MenuItemResponse) => {
    setUpdatingId(item._id);
    try {
      const updated = await restaurantOrdersApi.toggleItemAvailability(item._id);
      setItems((prev) =>
        prev.map((it) => (it._id === item._id ? { ...it, isAvailable: updated.isAvailable } : it))
      );
      toast(
        'success',
        `"${item.name}" marked as ${updated.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}`
      );
    } catch {
      toast('error', 'Failed to update dish availability.');
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: TableProps<MenuItemResponse>['columns'] = [
    {
      title: 'Dish / Meal',
      key: 'name',
      render: (_: unknown, r: MenuItemResponse) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-surface-container flex items-center justify-center overflow-hidden shrink-0 border border-outline-variant">
            {r.images && r.images.length > 0 ? (
              <img src={r.images[0]} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed size={16} className="text-outline" />
            )}
          </div>
          <div>
            <span className="font-semibold text-sm text-on-surface block">{r.name}</span>
            <p className="text-xs text-outline line-clamp-1 max-w-xs">{r.description || 'No description'}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: unknown, r: MenuItemResponse) => (
        <span className="text-xs font-medium text-outline">
          {typeof r.categoryId === 'object' ? r.categoryId?.name : 'General'}
        </span>
      ),
    },
    {
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'price',
      render: (price: number) => (
        <span className="font-mono text-sm font-semibold text-on-surface">
          ₦{price.toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Kitchen Stock Status',
      key: 'status',
      width: 160,
      render: (_: unknown, r: MenuItemResponse) => (
        <Badge
          status={r.isAvailable ? RoomStatus.Available : RoomStatus.Maintenance}
          label={r.isAvailable ? 'In Stock (Live)' : 'Out of Stock (Hidden)'}
        />
      ),
    },
    {
      title: '1-Tap Toggle',
      key: 'action',
      width: 140,
      render: (_: unknown, r: MenuItemResponse) => (
        <Button
          size="sm"
          variant={r.isAvailable ? 'secondary' : 'default'}
          loading={updatingId === r._id}
          onClick={() => handleToggle(r)}
        >
          {r.isAvailable ? 'Mark Out of Stock' : 'Mark In Stock'}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Eyebrow Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
          Kitchen Operations
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">
          Dish Stock & Availability
        </h1>
        <div className="flex items-center gap-3">
          <Input
            size="sm"
            placeholder="Search dishes..."
            prefix={<Search size={14} className="text-outline" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-64"
          />
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
            onClick={() => fetchItems()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table Data Shell */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<MenuItemResponse>
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={false}
        />
      </div>
    </div>
  );
}
