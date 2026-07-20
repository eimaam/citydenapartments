import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select, Option, Drawer, Badge, Table, UserRole } from '@citydenapartments/shared';
import { RoomStatus, type RoomStatusType } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus, Search, X } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';

const LIMIT = 20;

const statusTabs: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Available', value: RoomStatus.Available },
  { label: 'Occupied', value: RoomStatus.Occupied },
  { label: 'Maintenance', value: RoomStatus.Maintenance },
  { label: 'Reserved', value: RoomStatus.Maintenance },
];

interface Room {
  _id: string;
  roomNumber: string;
  status: RoomStatusType;
  maxGuests: number;
  amenities?: string[];
  roomTypeId: { _id: string; name: string; basePrice: number };
  branchId: { _id: string; name: string };
}

interface PaginatedData {
  items: Room[];
  total: number;
  page: number;
  limit: number;
}

interface RoomType {
  _id: string;
  name: string;
  basePrice: number;
}

const canCreate = (role: string) => role === UserRole.SuperAdmin || role === UserRole.IT;

export default function AdminRoomsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ roomNumber: '', maxGuests: 2, status: RoomStatus.Available as string, roomTypeId: '', amenities: [] as string[] });
  const [amenityInput, setAmenityInput] = useState('');
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = `page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`;
      const res = await api.get<PaginatedData>(`/rooms?${params}`);
      setData({ items: res.items, total: res.total, page: res.page, limit: res.limit });
    }
    catch { toast('error', 'Failed to load rooms.'); }
    finally { setLoading(false); }
  }, [toast, user?.activeBranchId, page, search, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    api.get<{ items: RoomType[] }>('/room-types?limit=100').then((res) => setRoomTypes(res.items)).catch(() => {});
  }, []);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const openCreate = () => { setEdit(null); setForm({ roomNumber: '', maxGuests: 2, status: RoomStatus.Available, roomTypeId: '', amenities: [] }); setAmenityInput(''); setDrawer(true); };
  const openEdit = (r: Room) => { setEdit(r); setForm({ roomNumber: r.roomNumber, maxGuests: r.maxGuests, status: r.status, roomTypeId: '', amenities: r.amenities ?? [] }); setAmenityInput(''); setDrawer(true); };

  const save = async () => {
    if (!form.roomNumber.trim()) { toast('error', 'Room number is required.'); return; }
    if (form.maxGuests < 1) { toast('error', 'Max guests must be at least 1.'); return; }
    if (!edit && !form.roomTypeId) { toast('error', 'Room type is required.'); return; }
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/rooms/${edit._id}`, { roomNumber: form.roomNumber, maxGuests: form.maxGuests, amenities: form.amenities });
        if (form.status !== edit.status) await api.patch(`/rooms/${edit._id}/status`, { status: form.status });
        toast('success', 'Room updated.');
      } else {
        await api.post('/rooms', { roomNumber: form.roomNumber, roomTypeId: form.roomTypeId, maxGuests: form.maxGuests, amenities: form.amenities });
        toast('success', 'Room created.');
      }
      setDrawer(false);
      fetch();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const columns: TableProps<Room>['columns'] = [
    { title: 'Room #', dataIndex: 'roomNumber', key: 'num', render: (_: unknown, r: Room) => <span className="font-mono font-medium">{r.roomNumber}</span> },
    { title: 'Type', key: 'type', render: (_: unknown, r: Room) => r.roomTypeId?.name ?? '—' },
    { title: 'Branch', key: 'branch', render: (_: unknown, r: Room) => r.branchId?.name ?? '—' },
    { title: 'Status', key: 'status', width: 120, render: (_: unknown, r: Room) => <Badge status={r.status} /> },
    { title: 'Guests', dataIndex: 'maxGuests', key: 'guests', width: 80 },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Rooms</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search rooms..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          {canCreate(user?.role ?? '') && <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>New Room</Button>}
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded bg-surface-container w-fit">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{ background: statusFilter === tab.value ? 'var(--color-surface-container-lowest)' : 'transparent', color: statusFilter === tab.value ? 'var(--color-on-surface)' : 'var(--color-outline)', boxShadow: statusFilter === tab.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<Room>
          columns={columns}
          dataSource={data.items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: data.page,
            pageSize: data.limit,
            total: data.total,
            showSizeChanger: true,
            onChange: (p) => setPage(p),
          }}
          onRow={(r) => ({ onClick: () => openEdit(r), style: { cursor: 'pointer' } })}
        />
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)}
        title={edit ? 'Edit Room' : 'New Room'} size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button><Button loading={saving} onClick={save}>{edit ? 'Save' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input size="lg" placeholder="Room Number" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
          {!edit && (
            <Select size="lg" className="w-full" placeholder="Select room type" value={form.roomTypeId || undefined} onChange={(v) => setForm({ ...form, roomTypeId: v })}>
              {roomTypes.map((rt) => <Option key={rt._id} value={rt._id}>{rt.name} (₦{rt.basePrice.toLocaleString()})</Option>)}
            </Select>
          )}
          <Input size="lg" type="number" placeholder="Max Guests" value={form.maxGuests} onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })} />
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide mb-1 block">Amenities</label>
            <div className="flex items-center gap-2">
              <Input size="sm" placeholder="Type and press Enter" value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ',') && amenityInput.trim()) {
                    e.preventDefault();
                    setForm({ ...form, amenities: [...form.amenities, amenityInput.trim()] });
                    setAmenityInput('');
                  }
                }} />
              <Button size="sm" variant="secondary"
                onClick={() => { if (amenityInput.trim()) { setForm({ ...form, amenities: [...form.amenities, amenityInput.trim()] }); setAmenityInput(''); } }}>
                Add
              </Button>
            </div>
            {form.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.amenities.map((a, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-primary-container/20 text-primary">
                    {a}
                    <button type="button" onClick={() => setForm({ ...form, amenities: form.amenities.filter((_, j) => j !== i) })}
                      className="cursor-pointer bg-transparent border-none p-0 text-primary/60 hover:text-primary">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {edit && (
            <Select size="lg" className="w-full" value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
              {Object.values(RoomStatus).map((s) => <Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Option>)}
            </Select>
          )}
        </div>
      </Drawer>
    </div>
  );
}
