import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, DoorOpen, Users } from 'lucide-react';
import { Input, Badge, RoomStatus, Table, Select, Option, UserRole, type RoomStatusType } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { useAuth } from '../../../contexts/auth';
import { can } from '../../../components/ui/Can';
import { useToast } from '../../../components/ui/Toast';
import { roomsApi, type RoomResponse, type PaginatedRooms } from '../api/rooms.api';

type StatusFilter = 'all' | RoomStatusType;

const LIMIT = 20;

const tabs: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: RoomStatus.Available },
  { label: 'Occupied', value: RoomStatus.Occupied },
  { label: 'Dirty', value: RoomStatus.Dirty },
  { label: 'Maintenance', value: RoomStatus.Maintenance },
];

export default function RoomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<PaginatedRooms>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canUpdateStatus = can(user, [UserRole.SuperAdmin, UserRole.FacilityManager, UserRole.FrontOfficeManager, UserRole.HouseKeeper, UserRole.Reception]);

  const validTransitions: Record<string, { value: RoomStatusType; label: string }[]> = {
    [RoomStatus.Available]: [
      { value: RoomStatus.Dirty, label: 'Dirty' },
      { value: RoomStatus.Maintenance, label: 'Maintenance' },
    ],
    [RoomStatus.Dirty]: [
      { value: RoomStatus.Available, label: 'Available' },
    ],
    [RoomStatus.Occupied]: [
      { value: RoomStatus.Dirty, label: 'Dirty' },
    ],
    [RoomStatus.Maintenance]: [
      { value: RoomStatus.Available, label: 'Available' },
    ],
  };

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roomsApi.list({ page, limit: LIMIT, search: search || undefined, status: filter === 'all' ? undefined : filter });
      setRooms({ items: res.items, total: res.total, page: res.page, limit: res.limit });
    } finally { setLoading(false); }
  }, [page, filter, search, user?.activeBranchId]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await roomsApi.list({ limit: 20 });
      setCounts(res.items.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>));
    } catch { /* silent */ }
  }, [user?.activeBranchId]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    setUpdatingIds((prev) => new Set(prev).add(roomId));
    try {
      await roomsApi.updateStatus(roomId, newStatus);
      toast('success', `Room status updated to ${newStatus}.`);
      fetchRooms();
      fetchCounts();
    } catch (e: any) {
      toast('error', e.message ?? 'Failed to update status.');
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(roomId);
        return next;
      });
    }
  };

  const columns: TableProps<RoomResponse>['columns'] = [
    { title: 'Room', dataIndex: 'roomNumber', key: 'room', width: 120,
      render: (_: unknown, r: RoomResponse) => (<div className="flex items-center gap-2"><DoorOpen size={14} className="text-primary" /><span className="font-mono font-medium">{r.roomNumber}</span></div>) },
    { title: 'Type', key: 'type', render: (_: unknown, r: RoomResponse) => r.roomTypeId?.name || 'Standard' },
    { title: 'Status', key: 'status', width: 120, render: (_: unknown, r: RoomResponse) => <Badge status={r.status} /> },
    { title: 'Guests', dataIndex: 'maxGuests', key: 'guests', width: 80,
      render: (v: number) => <div className="flex items-center gap-1"><Users size={12} /><span>{v}</span></div> },
    { title: 'Price/Night', key: 'price', width: 130,
      render: (_: unknown, r: RoomResponse) => <span className="font-medium">—</span> },
  ];

  if (canUpdateStatus) {
    columns.push({
      title: 'Action', key: 'action', width: 180,
      render: (_: unknown, r: RoomResponse) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <Select
            size="sm"
            className="w-full"
            value={r.status}
            loading={updatingIds.has(r._id)}
            onChange={(v) => handleStatusChange(r._id, v)}
          >
            {(validTransitions[r.status] || []).map((t) => (
              <Option key={t.value} value={t.value}>{t.label}</Option>
            ))}
          </Select>
        </div>
      ),
    });
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Property</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Rooms</h1>
        <Input size="sm" placeholder="Search rooms..." prefix={<Search size={14} className="text-outline" />}
          value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-56" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { status: RoomStatus.Available, label: 'Available', color: '#10b981' },
          { status: RoomStatus.Occupied, label: 'Occupied', color: '#d4af37' },
          { status: RoomStatus.Dirty, label: 'Dirty', color: '#f59e0b' },
          { status: RoomStatus.Maintenance, label: 'Maintenance', color: '#ef4444' },
        ].map(({ status, label, color }) => (
          <button key={status} onClick={() => setFilter(status as StatusFilter)}
            className="flex items-center gap-3 p-4 rounded-lg border bg-surface-container-lowest transition-all cursor-pointer"
            style={{ borderColor: filter === status ? color : 'var(--color-outline-variant)', boxShadow: filter === status ? `0 0 0 1px ${color}` : 'none' }}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div><p className="text-2xl font-bold text-on-surface">{counts[status] ?? 0}</p><p className="text-xs text-on-surface-variant">{label}</p></div>
          </button>
        ))}
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded bg-surface-container w-fit">
        {tabs.map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{ background: filter === tab.value ? 'var(--color-surface-container-lowest)' : 'transparent', color: filter === tab.value ? 'var(--color-on-surface)' : 'var(--color-outline)', boxShadow: filter === tab.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<RoomResponse>
          columns={columns}
          dataSource={rooms.items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: rooms.page, pageSize: rooms.limit, total: rooms.total,
            showSizeChanger: true,
            showTotal: (total: number) => `${total} room${total !== 1 ? 's' : ''}`,
            onChange: (p) => setPage(p),
          }}
        />
      </div>
    </div>
  );
}
