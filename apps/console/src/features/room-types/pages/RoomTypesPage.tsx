import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Drawer, Table } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';

interface RoomType {
  _id: string;
  name: string;
  basePrice: number;
  minPriceAllowed: number;
  branchId: { _id: string; name: string };
  amenities: string[];
}

export default function RoomTypesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<RoomType | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', basePrice: 0, minPriceAllowed: 0 });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.get<RoomType[]>('/room-types')); }
    catch { toast('error', 'Failed to load room types.'); }
    finally { setLoading(false); }
  }, [toast, user?.activeBranchId]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEdit(null); setForm({ name: '', basePrice: 0, minPriceAllowed: 0 }); setDrawer(true); };
  const openEdit = (r: RoomType) => { setEdit(r); setForm({ name: r.name, basePrice: r.basePrice, minPriceAllowed: r.minPriceAllowed }); setDrawer(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (edit) await api.patch(`/room-types/${edit._id}`, form);
      else await api.post('/room-types', { ...form, branchId: '' });
      toast('success', edit ? 'Room type updated.' : 'Room type created.');
      setDrawer(false);
      fetch();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const columns: TableProps<RoomType>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Branch', key: 'branch', render: (_: unknown, r: RoomType) => r.branchId?.name ?? '—' },
    { title: 'Base Price', dataIndex: 'basePrice', key: 'price', render: (_: unknown, r: RoomType) => `₦${r.basePrice.toLocaleString()}` },
    { title: 'Min Price', dataIndex: 'minPriceAllowed', key: 'min', render: (_: unknown, r: RoomType) => `₦${r.minPriceAllowed.toLocaleString()}` },
    { title: 'Amenities', dataIndex: 'amenities', key: 'amenities', ellipsis: true, render: (_: unknown, r: RoomType) => r.amenities?.join(', ') ?? '—' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Room Types</h1>
        <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>New Type</Button>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div> :
          <Table<RoomType> columns={columns} dataSource={items} rowKey="_id" pagination={false} onRow={(r) => ({ onClick: () => openEdit(r), style: { cursor: 'pointer' } })} />}
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={edit ? 'Edit Room Type' : 'New Room Type'} size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button><Button loading={saving} onClick={save}>{edit ? 'Save' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input size="lg" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input size="lg" type="number" placeholder="Base Price (₦)" value={form.basePrice || ''} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
          <Input size="lg" type="number" placeholder="Min Allowed Price (₦)" value={form.minPriceAllowed || ''} onChange={(e) => setForm({ ...form, minPriceAllowed: Number(e.target.value) })} />
        </div>
      </Drawer>
    </div>
  );
}
