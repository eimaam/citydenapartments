import { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Drawer,
  Badge,
  Table,
  RoomStatus,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type { DeliveryLocationResponse } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { restaurantAdminApi } from '../api/restaurant-admin.api';

export default function DeliveryZonesPage() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<DeliveryLocationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<DeliveryLocationResponse | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    zoneName: '',
    deliveryFee: 1500,
    estimatedDeliveryMinutes: 45,
    sortOrder: 0,
    isActive: true,
  });

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await restaurantAdminApi.getLocations();
      setLocations(data || []);
    } catch {
      toast('error', 'Failed to load delivery zones.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openCreate = () => {
    setEditingLocation(null);
    setForm({
      zoneName: '',
      deliveryFee: 1500,
      estimatedDeliveryMinutes: 45,
      sortOrder: locations.length,
      isActive: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (loc: DeliveryLocationResponse) => {
    setEditingLocation(loc);
    setForm({
      zoneName: loc.zoneName,
      deliveryFee: loc.deliveryFee,
      estimatedDeliveryMinutes: loc.estimatedDeliveryMinutes || 45,
      sortOrder: loc.sortOrder || 0,
      isActive: loc.isActive,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.zoneName.trim()) {
      toast('error', 'Zone name is required.');
      return;
    }
    if (form.deliveryFee < 0) {
      toast('error', 'Delivery fee cannot be negative.');
      return;
    }

    try {
      if (editingLocation) {
        await restaurantAdminApi.updateLocation(editingLocation._id, form);
        toast('success', 'Delivery zone updated.');
      } else {
        await restaurantAdminApi.createLocation(form);
        toast('success', 'Delivery zone added.');
      }
      setDrawerOpen(false);
      setEditingLocation(null);
      fetchLocations();
    } catch (err: any) {
      toast('error', err.response?.data?.message || err.message || 'Failed to save delivery zone.');
    }
  };

  const handleDelete = async (loc: DeliveryLocationResponse) => {
    if (!confirm(`Are you sure you want to delete delivery zone "${loc.zoneName}"?`)) return;
    try {
      await restaurantAdminApi.deleteLocation(loc._id);
      toast('success', 'Delivery zone removed.');
      fetchLocations();
    } catch (err: any) {
      toast('error', err.response?.data?.message || err.message || 'Failed to delete location.');
    }
  };

  const filteredLocations = locations.filter((loc) =>
    loc.zoneName.toLowerCase().includes(search.toLowerCase())
  );

  const columns: TableProps<DeliveryLocationResponse>['columns'] = [
    {
      title: 'Zone / Coverage Area',
      key: 'name',
      render: (_: unknown, r: DeliveryLocationResponse) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-surface-container flex items-center justify-center text-primary">
            <Truck size={16} />
          </div>
          <span className="font-semibold text-sm text-on-surface">{r.zoneName}</span>
        </div>
      ),
    },
    {
      title: 'Delivery Fee',
      dataIndex: 'deliveryFee',
      key: 'fee',
      render: (fee: number) => (
        <span className="font-mono text-sm font-semibold text-on-surface">
          {fee === 0 ? 'Free' : `₦${fee.toLocaleString()}`}
        </span>
      ),
    },
    {
      title: 'Est. Delivery Time',
      dataIndex: 'estimatedDeliveryMinutes',
      key: 'time',
      render: (min: number) => <span className="text-xs text-outline">{min || 45} mins</span>,
    },
    {
      title: 'Sort Order',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (order: number) => <span className="font-mono text-xs">{order || 0}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      width: 120,
      render: (active: boolean) => (
        <Badge
          status={active ? RoomStatus.Available : RoomStatus.Maintenance}
          label={active ? 'Active' : 'Disabled'}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, r: DeliveryLocationResponse) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<Edit2 size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              openEdit(r);
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            icon={<Trash2 size={13} className="text-red-500" />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Eyebrow Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">
          Restaurant Logistics
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Delivery Zones & Pricing</h1>
        <div className="flex items-center gap-3">
          <Input
            size="sm"
            placeholder="Search zones..."
            prefix={<Search size={14} className="text-outline" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!w-64"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>
            New Zone
          </Button>
        </div>
      </div>

      {/* Table Data Shell */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<DeliveryLocationResponse>
          columns={columns}
          dataSource={filteredLocations}
          rowKey="_id"
          loading={loading}
          pagination={false}
          onRow={(r) => ({
            onClick: () => openEdit(r),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Create / Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingLocation ? `Edit Zone: ${editingLocation.zoneName}` : 'New Delivery Zone'}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingLocation ? 'Save Changes' : 'Create Zone'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Zone / Area Name *
            </label>
            <Input
              size="lg"
              placeholder="e.g. Wuse 2, Maitama, Central Business District"
              value={form.zoneName}
              onChange={(e) => setForm({ ...form, zoneName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
                Delivery Fee (₦) *
              </label>
              <Input
                size="lg"
                type="number"
                placeholder="1500"
                value={form.deliveryFee}
                onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
                Est. Time (Mins)
              </label>
              <Input
                size="lg"
                type="number"
                placeholder="45"
                value={form.estimatedDeliveryMinutes}
                onChange={(e) =>
                  setForm({ ...form, estimatedDeliveryMinutes: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1 block">
              Display Sort Order
            </label>
            <Input
              size="lg"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-outline-variant text-primary"
              />
              Zone Active & Available at Checkout
            </label>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
