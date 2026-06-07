import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select, Option, Drawer, Badge, Table } from '@citydenapartments/shared';
import { RoomStatus, type RoomStatusType } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';

interface Room {
  _id: string;
  roomNumber: string;
  status: RoomStatusType;
  maxGuests: number;
  roomTypeId: { _id: string; name: string; basePrice: number };
  branchId: { _id: string; name: string };
}

export default function AdminRoomsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ roomNumber: '', maxGuests: 2, status: RoomStatus.Available as string });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setRooms(await api.get<Room[]>('/rooms')); }
    catch { toast('error', 'Failed to load rooms.'); }
    finally { setLoading(false); }
  }, [toast, user?.activeBranchId]);

  useEffect(() => { fetch(); }, [fetch]);

  const openEdit = (r: Room) => { setEdit(r); setForm({ roomNumber: r.roomNumber, maxGuests: r.maxGuests, status: r.status }); setDrawer(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/rooms/${edit._id}`, { roomNumber: form.roomNumber, maxGuests: form.maxGuests });
        if (form.status !== edit.status) await api.patch(`/rooms/${edit._id}/status`, { status: form.status });
      }
      toast('success', 'Room updated.');
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Rooms</h1>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => toast('info', 'Create rooms from the Room Types section.')}>New Room</Button>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div> :
          <Table<Room> columns={columns} dataSource={rooms} rowKey="_id" pagination={false} onRow={(r) => ({ onClick: () => openEdit(r), style: { cursor: 'pointer' } })} />}
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Edit Room" size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button><Button loading={saving} onClick={save}>Save</Button></div>}>
        <div className="space-y-4">
          <Input size="lg" placeholder="Room Number" value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
          <Input size="lg" type="number" placeholder="Max Guests" value={form.maxGuests} onChange={(e) => setForm({ ...form, maxGuests: Number(e.target.value) })} />
          <Select size="lg" className="w-full" value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
            {Object.values(RoomStatus).map((s) => <Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Option>)}
          </Select>
        </div>
      </Drawer>
    </div>
  );
}
