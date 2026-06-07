import { useState, useEffect, useCallback } from 'react';
import { Search, DoorOpen, Users, Tag } from 'lucide-react';
import { Input, Badge, RoomStatus, type RoomStatusType } from '@citydenapartments/shared';
import { Spinner } from '../../../components/ui/Spinner';
import { roomsApi, type RoomResponse } from '../api/rooms.api';

type StatusFilter = 'all' | RoomStatusType;

const tabs: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Available', value: RoomStatus.Available },
  { label: 'Occupied', value: RoomStatus.Occupied },
  { label: 'Dirty', value: RoomStatus.Dirty },
  { label: 'Maintenance', value: RoomStatus.Maintenance },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try { setRooms(await roomsApi.list(filter === 'all' ? undefined : filter)); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const filtered = rooms.filter((r) => !search || r.roomNumber.toLowerCase().includes(search.toLowerCase()) || r.roomTypeId?.name?.toLowerCase().includes(search.toLowerCase()));

  const counts = rooms.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Property</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Rooms</h1>
        <Input size="sm" placeholder="Search rooms..." prefix={<Search size={14} className="text-outline" />}
          value={search} onChange={(e) => setSearch(e.target.value)} className="!w-56" />
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

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((room) => (
            <div key={room._id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 transition-all duration-300 hover:border-outline hover:shadow-ambient">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DoorOpen size={18} className="text-primary" />
                  <span className="font-bold text-lg text-on-surface">{room.roomNumber}</span>
                </div>
                <Badge status={room.status} />
              </div>
              <p className="text-sm font-medium text-on-surface-variant mb-3">{room.roomTypeId?.name || 'Standard'}</p>
              <div className="space-y-2 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2"><Users size={12} /><span>Up to {room.maxGuests} guests</span></div>
                <div className="flex items-center gap-2"><Tag size={12} /><span className="font-medium text-on-surface">₦{room.roomTypeId?.basePrice?.toLocaleString()}/night</span></div>
              </div>
              {room.roomTypeId?.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-outline-variant/50">
                  {room.roomTypeId.amenities.map((a) => <span key={a} className="px-2 py-0.5 text-[10px] rounded-full bg-surface-container text-on-surface-variant">{a}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
