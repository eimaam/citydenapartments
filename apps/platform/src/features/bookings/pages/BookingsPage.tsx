import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Copy, Check, Printer } from 'lucide-react';
import { format } from 'date-fns';
import {
  Button, Input, Table, Drawer, Modal, Badge,
  BookingStatus, BookingReceipt, BookingFormDrawer,
  type BranchInfo, type ReceiptBooking,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';
import { bookingsApi, type BookingResponse } from '../api/bookings.api';
import { roomsApi } from '../../rooms/api/rooms.api';
import { roomTypesApi } from '../../room-types/api/room-types.api';
import { customersApi } from '../api/customers.api';
import { discountCodesApi } from '../../discount-codes/api/discount-codes.api';

const LIMIT = 20;

const statusTabs: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Reserved', value: BookingStatus.Reserved },
  { label: 'Checked In', value: BookingStatus.Checked_In },
  { label: 'Checked Out', value: BookingStatus.Checked_Out },
  { label: 'Cancelled', value: BookingStatus.Cancelled },
];

interface PaginatedData {
  items: BookingResponse[];
  total: number;
  page: number;
  limit: number;
}

export default function BookingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<BookingResponse | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<ReceiptBooking | null>(null);
  const [receiptBranch, setReceiptBranch] = useState<BranchInfo | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.list({ page, limit: LIMIT, status: statusFilter || undefined, search: search || undefined });
      setData({ items: res.items, total: res.total, page: res.page, limit: res.limit });
    } catch { toast('error', 'Failed to load bookings.'); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, toast, user?.activeBranchId]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const handleAction = async (action: 'checkIn' | 'checkOut' | 'cancel', id: string) => {
    const labels = { checkIn: 'Checked in', checkOut: 'Checked out', cancel: 'Cancelled' };
    setActionLoading(`${action}-${id}`);
    try {
      if (action === 'checkIn') await bookingsApi.checkIn(id);
      else if (action === 'checkOut') await bookingsApi.checkOut(id);
      else await bookingsApi.cancel(id);
      const updated = await bookingsApi.get(id);
      setShowDetail(updated);
      toast('success', `${labels[action]} successfully.`);
      fetchBookings();
    } catch (e) { toast('error', e instanceof Error ? e.message : `Failed to ${action}.`); }
    finally { setActionLoading(''); }
  };

  const openReceipt = useCallback(async (booking: ReceiptBooking) => {
    setLoadingReceipt(true);
    setReceiptBooking(booking);
    try {
      const branch = await api.get<BranchInfo>(`/branches/${booking.branchId}`);
      setReceiptBranch(branch);
      setShowReceipt(true);
    } catch { toast('error', 'Failed to load branch info.'); }
    finally { setLoadingReceipt(false); }
  }, [toast]);

  const renderRoomNumbers = (_: unknown, r: BookingResponse) => {
    const roomStr = (r.rooms || []).map((rm) => rm.roomId?.roomNumber).filter(Boolean).join(', ');
    if (roomStr.length > 20) return <span className="text-xs" title={roomStr}>{roomStr.slice(0, 18)}...</span>;
    return <span className="text-xs">{roomStr || '—'}</span>;
  };

  const columns: TableProps<BookingResponse>['columns'] = [
    { title: 'Reference', dataIndex: 'bookingReference', key: 'ref', width: 120, render: (_: unknown, r: BookingResponse) => <span className="font-mono text-xs">{r.bookingReference?.slice(-8)}</span> },
    { title: 'Guest', key: 'guest', render: (_: unknown, r: BookingResponse) => (<div><p className="font-medium">{r.guestDetails.name}</p><p className="text-xs opacity-60">{r.guestDetails.phone}</p></div>) },
    { title: 'Room(s)', key: 'room', width: 110, render: renderRoomNumbers, responsive: ['md' as const] },
    { title: 'Dates', key: 'dates', width: 190, render: (_: unknown, r: BookingResponse) => (<span className="text-xs">{format(new Date(r.checkInDate), 'd MMM')} — {format(new Date(r.checkOutDate), 'd MMM')}</span>) },
    { title: 'Status', dataIndex: 'bookingStatus', key: 'status', width: 120, render: (_: unknown, r: BookingResponse) => <Badge status={r.bookingStatus} /> },
    { title: 'Paid', dataIndex: 'totalAmountPaid', key: 'paid', width: 110, align: 'right' as const, render: (_: unknown, r: BookingResponse) => <span className="font-medium">₦{r.totalAmountPaid?.toLocaleString()}</span> },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Management</span></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Bookings</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search reference, guest, phone..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>New Booking</Button>
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
            onChange: (p, ps) => { setPage(p); if (ps !== LIMIT) { /* page size change handled by re-fetch with new limit */ } },
          }}
          onRow={(record) => ({
            onClick: () => {
              setShowDetail(record);
              bookingsApi.get(record._id).then((full) => setShowDetail(full)).catch(() => {});
            },
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <BookingFormDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        fetchAvailableRooms={(ci, co) => roomsApi.available(ci, co)}
        fetchRoomTypes={() => roomTypesApi.list().then(r => r.items)}
        createBooking={(data) => bookingsApi.create(data as any)}
        searchCustomer={(phone) => customersApi.search(phone)}
        validateDiscountCode={(code) => discountCodesApi.validate(code)}
        onBookingCreated={(booking) => { fetchBookings(); openReceipt(booking as unknown as ReceiptBooking); }}
        roomSelection="multiple"
        showCustomerLookup={true}
        userRole={user?.role}
      />

      {/* Detail Drawer */}
      <Drawer open={!!showDetail} onClose={() => setShowDetail(null)} title="Booking Details" width={480}>
        {showDetail && (<div className="space-y-5">
          <div className="flex items-center justify-between"><div><p className="text-xs text-outline">Reference</p><div className="flex items-center gap-2"><p className="font-mono font-medium">{showDetail.bookingReference}</p><button onClick={() => { navigator.clipboard.writeText(showDetail.bookingReference); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }} className="p-0.5 rounded hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-primary">{copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}</button></div></div><Badge status={showDetail.bookingStatus} /></div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-outline">Guest</p><p className="font-medium">{showDetail.guestDetails.name}</p><p className="text-xs">{showDetail.guestDetails.phone}</p>{showDetail.guestDetails.email && <p className="text-xs">{showDetail.guestDetails.email}</p>}</div>
            <div><p className="text-xs text-outline">Room(s)</p>{(showDetail.rooms || []).map((r, i) => <div key={i}><p className="font-medium">{r.roomId?.roomNumber}</p><p className="text-xs">{r.roomId?.roomTypeId?.name}</p></div>)}</div>
            <div><p className="text-xs text-outline">Check-in</p><p>{format(new Date(showDetail.checkInDate), 'EEE d MMM, yyyy')}</p></div>
            <div><p className="text-xs text-outline">Check-out</p><p>{format(new Date(showDetail.checkOutDate), 'EEE d MMM, yyyy')}</p></div>
            <div><p className="text-xs text-outline">Total Paid</p><p className="font-medium">₦{showDetail.totalAmountPaid?.toLocaleString()}</p></div>
            <div><p className="text-xs text-outline">Payment</p><p>{showDetail.paymentMethod?.replace('_', ' ')}</p></div>
            <div><p className="text-xs text-outline">Source</p><p>{showDetail.bookingSource}</p></div>
          </div>
          <div className="pt-2 border-t border-outline-variant"><p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-2">Guest Info</p><div className="grid grid-cols-2 gap-3 text-sm">{[
            ['Address', showDetail.guestDetails.address],
            ['Nationality', showDetail.guestDetails.nationality],
            ['Gender', showDetail.guestDetails.gender],
            ['DOB', showDetail.guestDetails.dob ? format(new Date(showDetail.guestDetails.dob), 'd MMM yyyy') : null],
            ['Phone 2', showDetail.guestDetails.phone2],
            ['Coming From', showDetail.guestDetails.comingFrom],
            ['State of Origin', showDetail.guestDetails.stateOfOrigin],
            ['Occupation', showDetail.guestDetails.occupation],
            ['Next Destination', showDetail.guestDetails.nextDestination],
            ['Religion', showDetail.guestDetails.religion],
          ].filter(([, v]) => v).map(([label, value]) => (<div key={label as string}><p className="text-xs text-outline">{label as string}</p><p className="font-medium">{value as string}</p></div>))}</div></div>
          <div className="flex gap-3 pt-2 flex-wrap">{showDetail.bookingStatus === BookingStatus.Checked_In && <Button size="sm" loading={actionLoading === `checkOut-${showDetail._id}`} onClick={() => handleAction('checkOut', showDetail._id)}>Check Out</Button>}{(showDetail.bookingStatus === BookingStatus.Reserved || showDetail.bookingStatus === BookingStatus.Confirmed) && <Button size="sm" loading={actionLoading === `checkIn-${showDetail._id}`} onClick={() => handleAction('checkIn', showDetail._id)}>Check In</Button>}{showDetail.bookingStatus !== BookingStatus.Cancelled && showDetail.bookingStatus !== BookingStatus.Checked_Out && <Button variant="destructive" size="sm" loading={actionLoading === `cancel-${showDetail._id}`} onClick={() => handleAction('cancel', showDetail._id)}>Cancel</Button>}{showDetail.bookingStatus === BookingStatus.Checked_In && <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => { setShowDetail(null); openReceipt(showDetail as unknown as ReceiptBooking); }}>Print Receipt</Button>}</div>

          {showDetail.statusHistory && showDetail.statusHistory.length > 0 && (
            <div className="pt-4 border-t border-outline-variant">
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-3">Status History</p>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-outline-variant" />
                {[...showDetail.statusHistory].reverse().map((entry, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[18px] top-[6px] w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        backgroundColor: idx === 0 ? 'var(--color-primary)' : 'var(--color-surface-container-lowest)',
                        borderColor: 'var(--color-primary)',
                      }}
                    />
                    <p className="text-[10px] text-outline">
                      {format(new Date(entry.changedAt), 'd MMM yyyy, h:mm a')}
                    </p>
                    <p className="text-xs font-medium">
                      {entry.fromStatus ? (
                        <><span className="capitalize">{entry.fromStatus.replace('_', ' ')}</span> → <span className="capitalize">{entry.toStatus.replace('_', ' ')}</span></>
                      ) : (
                        <span className="capitalize">{entry.toStatus.replace('_', ' ')}</span>
                      )}
                      {entry.changedBy && (
                        <span className="text-outline font-normal"> by {entry.changedBy.firstName} {entry.changedBy.lastName}</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>)}
      </Drawer>

      {/* Receipt Modal */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} width={800}>
        {loadingReceipt ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : receiptBooking && receiptBranch ? (
          <BookingReceipt booking={receiptBooking} branch={receiptBranch} receptionistName={user?.name} />
        ) : null}
      </Modal>
    </div>
  );
}
