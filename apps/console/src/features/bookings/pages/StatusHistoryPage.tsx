import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, History } from 'lucide-react';
import { format } from 'date-fns';
import {
  Input, Table, Badge, BookingStatus,
  type BookingStatusType,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { bookingsApi, type BookingResponse, type StatusHistoryEntry } from '../api/bookings.api';

const LIMIT = 20;

const statusTabs: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Reserved', value: BookingStatus.Reserved },
  { label: 'Checked In', value: BookingStatus.Checked_In },
  { label: 'Checked Out', value: BookingStatus.Checked_Out },
  { label: 'Cancelled', value: BookingStatus.Cancelled },
];

function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return <p className="text-sm text-outline italic">No status history recorded.</p>;
  }

  return (
    <div className="relative pl-7 space-y-5">
      <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-outline-variant" />
      {[...history].reverse().map((entry, idx) => (
        <div key={idx} className="relative">
          <div
            className="absolute -left-[22px] top-[6px] w-3 h-3 rounded-full border-2"
            style={{
              backgroundColor: idx === 0 ? 'var(--color-primary)' : 'var(--color-surface-container-lowest)',
              borderColor: 'var(--color-primary)',
            }}
          />
          <p className="text-[11px] text-outline">
            {format(new Date(entry.changedAt), 'd MMM yyyy, h:mm a')}
          </p>
          <p className="text-sm font-medium">
            {entry.fromStatus ? (
              <><span className="capitalize">{entry.fromStatus.replace(/_/g, ' ')}</span> <span className="text-outline">→</span> <span className="capitalize">{entry.toStatus.replace(/_/g, ' ')}</span></>
            ) : (
              <span className="text-emerald-600 capitalize">{entry.toStatus.replace(/_/g, ' ')}</span>
            )}
            {entry.changedBy && (
              <span className="text-outline font-normal"> by {entry.changedBy.firstName} {entry.changedBy.lastName}</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function StatusHistoryPage() {
  const [data, setData] = useState<{ items: BookingResponse[]; total: number; page: number; limit: number }>({
    items: [], total: 0, page: 1, limit: LIMIT,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list({ page, limit: LIMIT, status: statusFilter || undefined, search: search || undefined });
      setData({ items: res.items, total: res.total, page: res.page, limit: res.limit });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const onSelectBooking = async (booking: BookingResponse) => {
    setSelectedBooking(booking);
    setDetailLoading(true);
    try {
      const full = await bookingsApi.get(booking._id);
      setSelectedBooking(full);
    } catch { /* keep list data */ }
    finally { setDetailLoading(false); }
  };

  const columns: TableProps<BookingResponse>['columns'] = [
    { title: 'Reference', dataIndex: 'bookingReference', key: 'ref', width: 130, render: (_: unknown, r: BookingResponse) => <span className="font-mono text-xs">{r.bookingReference}</span> },
    { title: 'Guest', key: 'guest', render: (_: unknown, r: BookingResponse) => (<div><p className="font-medium">{r.guestDetails.name}</p><p className="text-xs opacity-60">{r.guestDetails.phone}</p></div>) },
    { title: 'Room', dataIndex: ['roomId', 'roomNumber'], key: 'room', width: 80 },
    { title: 'Status', dataIndex: 'bookingStatus', key: 'status', width: 120, render: (_: unknown, r: BookingResponse) => <Badge status={r.bookingStatus} /> },
    { title: 'Dates', key: 'dates', width: 180, render: (_: unknown, r: BookingResponse) => (<span className="text-xs">{format(new Date(r.checkInDate), 'd MMM')} — {format(new Date(r.checkOutDate), 'd MMM')}</span>) },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Audit</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <History size={22} className="text-outline" />
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Status History</h1>
        </div>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search reference, guest, phone..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded bg-surface-container w-fit">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{
              background: statusFilter === tab.value ? 'var(--color-surface-container-lowest)' : 'transparent',
              color: statusFilter === tab.value ? 'var(--color-on-surface)' : 'var(--color-outline)',
              boxShadow: statusFilter === tab.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Table */}
        <div className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <Table<BookingResponse>
            columns={columns}
            dataSource={data.items}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: data.page,
              pageSize: data.limit,
              total: data.total,
              showSizeChanger: true,
              showTotal: (total: number) => `${total} booking${total !== 1 ? 's' : ''}`,
              onChange: (p) => setPage(p),
            }}
            onRow={(record) => ({
              onClick: () => onSelectBooking(record),
              style: {
                cursor: 'pointer',
                background: selectedBooking?._id === record._id ? 'var(--color-primary-container)' : undefined,
              },
            })}
          />
        </div>

        {/* Timeline Panel */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedBooking ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-outline">Booking</p>
                <p className="font-mono font-medium text-sm">{selectedBooking.bookingReference}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge status={selectedBooking.bookingStatus} />
                  <span className="text-xs text-outline">{selectedBooking.guestDetails.name}</span>
                </div>
                <p className="text-xs text-outline mt-1">
                  {(selectedBooking.rooms || []).map(r => r.roomId?.roomNumber).filter(Boolean).join(', ') || '—'} · {format(new Date(selectedBooking.checkInDate), 'd MMM')} — {format(new Date(selectedBooking.checkOutDate), 'd MMM')}
                </p>
              </div>

              <div className="border-t border-outline-variant pt-4">
                <p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-4">Transition Timeline</p>
                <StatusTimeline history={selectedBooking.statusHistory || []} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History size={32} className="text-outline-variant mb-3" />
              <p className="text-sm text-outline">Select a booking to view its status history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
