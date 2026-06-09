import { format } from 'date-fns';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Coffee, Check, Calendar, Users, Search } from 'lucide-react';
import { Button, Input, Table } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { breakfastApi, type ManifestEntry, type PaginatedManifest } from '../api/breakfast.api';

const LIMIT = 20;

export default function BreakfastPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manifest, setManifest] = useState<PaginatedManifest>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [countsData, setCountsData] = useState<ManifestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchManifest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await breakfastApi.manifest({ page, limit: LIMIT, search: search || undefined, date });
      setManifest({ items: res.items, total: res.total, page: res.page, limit: res.limit });
    } catch { toast('error', 'Failed to load breakfast manifest.'); }
    finally { setLoading(false); }
  }, [page, date, search, toast, user?.activeBranchId]);

  const fetchCounts = useCallback(async () => {
    try {
      const res = await breakfastApi.manifest({ limit: 20, date });
      setCountsData(res.items);
    } catch {}
  }, [date, user?.activeBranchId]);

  useEffect(() => { fetchManifest(); }, [fetchManifest]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { setPage(1); }, [date, search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const handleServe = async (entry: ManifestEntry) => {
    setServing((prev) => ({ ...prev, [entry.bookingId]: true }));
    try {
      await breakfastApi.serve({ bookingId: entry.bookingId, roomId: entry.roomId, guestName: entry.guestName, dateServed: date });
      toast('success', `${entry.guestName} served.`);
      await fetchManifest();
      await fetchCounts();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to record serving.');
    } finally { setServing((prev) => ({ ...prev, [entry.bookingId]: false })); }
  };

  const served = countsData.filter((e) => e.isServed).length;
  const pending = countsData.filter((e) => !e.isServed).length;

  const columns: TableProps<ManifestEntry>['columns'] = [
    { title: 'Room', dataIndex: 'roomNumber', key: 'room', width: 100, render: (_: unknown, r: ManifestEntry) => <span className="font-mono font-medium">{r.roomNumber}</span> },
    { title: 'Guest', dataIndex: 'guestName', key: 'guest', render: (_: unknown, r: ManifestEntry) => <span className="font-medium">{r.guestName}</span> },
    { title: 'Status', key: 'status', width: 140, responsive: ['sm' as const], render: (_: unknown, r: ManifestEntry) => (
      r.isServed ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check size={12} />Served at {r.servedAt ? format(new Date(r.servedAt), 'HH:mm') : '—'}</span>
      ) : <span className="text-xs text-amber-700">Pending</span>
    )},
    { title: 'Action', key: 'action', width: 100, align: 'right' as const, render: (_: unknown, r: ManifestEntry) => (
      r.isServed ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><Check size={14} />Served</span>
      ) : (
        <Button size="sm" loading={serving[r.bookingId]} onClick={() => handleServe(r)}>Serve</Button>
      )
    )},
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Kitchen</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Breakfast</h1>
          <p className="text-sm text-on-surface-variant mt-1">Daily meal manifest — mark guests as served.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input size="sm" placeholder="Search guest or room..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-48" />
          <Calendar size={16} className="text-outline" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-9 px-3 text-xs rounded border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total Guests', value: countsData.length, icon: Users, color: '#3b82f6' },
          { label: 'Served', value: served, icon: Coffee, color: '#10b981' },
          { label: 'Pending', value: pending, icon: Coffee, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center gap-2 mb-1"><Icon size={14} style={{ color }} /><span className="text-xs text-outline">{label}</span></div>
            <p className="text-2xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<ManifestEntry>
          columns={columns}
          dataSource={manifest.items}
          rowKey="bookingId"
          loading={loading}
          pagination={{
            current: manifest.page,
            pageSize: manifest.limit,
            total: manifest.total,
            showSizeChanger: true,
            showTotal: (total: number) => `${total} guest${total !== 1 ? 's' : ''}`,
            onChange: (p) => setPage(p),
          }}
        />
      </div>
    </div>
  );
}
