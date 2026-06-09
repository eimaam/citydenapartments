import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import { Plus, Search, Banknote, CreditCard, Building2, Users, Calendar, Copy, Check } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import {
  Button, Input, Select, Table, Option, Drawer, Badge,
  BookingStatus, PaymentMethod, BookingSource, RoomStatus,
  type BookingStatusType, type PaymentMethodType, type BookingSourceType,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { bookingsApi, type BookingResponse, type CreateBookingPayload } from '../api/bookings.api';
import { roomsApi, type RoomResponse } from '../../rooms/api/rooms.api';

const LIMIT = 20;

const statusTabs: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Confirmed', value: BookingStatus.Confirmed },
  { label: 'Checked In', value: BookingStatus.Checked_In },
  { label: 'Checked Out', value: BookingStatus.Checked_Out },
  { label: 'Cancelled', value: BookingStatus.Cancelled },
];

const paymentMethods = [
  { key: PaymentMethod.Cash, label: 'Cash', icon: Banknote, desc: 'Physical cash received at front desk.' },
  { key: PaymentMethod.POS_Card, label: 'POS / Card', icon: CreditCard, desc: 'Card swiped or chip inserted via POS terminal.' },
  { key: PaymentMethod.Bank_Transfer, label: 'Bank Transfer', icon: Building2, desc: 'Direct bank deposit or online transfer.' },
] as const;

const bookingSources = [
  { key: BookingSource.WalkIn, label: 'Walk-in' },
  { key: BookingSource.Phone, label: 'Phone' },
  { key: BookingSource.Online, label: 'Online' },
] as const;

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned) return null;
  if (!/^(\+234|0)?[789]\d{9}$/.test(cleaned)) return 'Enter a valid Nigerian number (e.g. 0803xxxxxxx).';
  return null;
}

function toDateStr(d: Date) { return format(d, 'yyyy-MM-dd'); }
function todayStr() { return toDateStr(new Date()); }
function tomorrowStr() { return toDateStr(addDays(new Date(), 1)); }

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
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<BookingResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  const [form, setForm] = useState<{
    roomId: string; guestName: string; guestPhone: string; guestEmail: string;
    numberOfGuests: number; checkInDate: string; nights: number; checkOutDate: string;
    useNights: boolean; actualPricePerNight: number; discount: number; totalAmountPaid: number;
    paymentMethod: PaymentMethodType; bookingSource: BookingSourceType;
  }>({
    roomId: '', guestName: '', guestPhone: '', guestEmail: '', numberOfGuests: 1,
    checkInDate: todayStr(), nights: 1, checkOutDate: tomorrowStr(), useNights: true,
    actualPricePerNight: 0, discount: 0, totalAmountPaid: 0,
    paymentMethod: PaymentMethod.Cash, bookingSource: BookingSource.WalkIn,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const selectedRoom = useMemo(() => rooms.find((r) => r._id === form.roomId), [rooms, form.roomId]);
  const basePrice = selectedRoom?.roomTypeId?.basePrice ?? 0;
  const minPrice = selectedRoom?.roomTypeId?.minPriceAllowed ?? 0;
  const computedNights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 1;
    const diff = Math.max(1, differenceInDays(new Date(form.checkOutDate), new Date(form.checkInDate)));
    return diff;
  }, [form.checkInDate, form.checkOutDate]);

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

  // reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  // debounced search
  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const openCreate = async () => {
    try { setRooms(await roomsApi.list({ status: RoomStatus.Available, limit: 20 }).then(r => r.items)); } catch { toast('error', 'Failed to load rooms.'); }
    setShowCreate(true);
  };

  const updateField = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  const onRoomChange = (roomId: string) => {
    const room = rooms.find((r) => r._id === roomId);
    const price = room?.roomTypeId?.basePrice ?? 0;
    const nights = form.useNights ? form.nights : computedNights;
    updateField('roomId', roomId);
    updateField('actualPricePerNight', price);
    updateField('totalAmountPaid', Math.max(0, (price * nights) - form.discount));
    setPriceError(null);
  };

  const onNightsChange = (n: number) => { const nights = Math.max(1, n); let co = addDays(new Date(form.checkInDate), nights); updateField('nights', nights); updateField('checkOutDate', toDateStr(co)); recalcTotal(Number(form.actualPricePerNight) || basePrice, form.discount, nights); };
  const onCheckInChange = (date: string) => { updateField('checkInDate', date); const nights = form.useNights ? form.nights : computedNights; let co = addDays(new Date(date), nights); updateField('checkOutDate', toDateStr(co)); };
  const onCheckOutChange = (date: string) => { updateField('checkOutDate', date); updateField('useNights', false); const nights = Math.max(1, differenceInDays(new Date(date), new Date(form.checkInDate))); updateField('nights', nights); recalcTotal(Number(form.actualPricePerNight) || basePrice, form.discount, nights); };

  const recalcTotal = (price: number, discount: number, nights: number) => { updateField('totalAmountPaid', Math.max(0, (price * nights) - discount)); };
  const onPriceChange = (price: number) => { updateField('actualPricePerNight', price); recalcTotal(price, form.discount, form.useNights ? form.nights : computedNights); setPriceError(price < minPrice ? `Minimum allowed price is ₦${minPrice.toLocaleString()}/night.` : null); };
  const onDiscountChange = (discount: number) => { updateField('discount', discount); recalcTotal(Number(form.actualPricePerNight) || basePrice, discount, form.useNights ? form.nights : computedNights); };
  const onPhoneChange = (phone: string) => { updateField('guestPhone', phone); setPhoneError(validatePhone(phone)); };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const phoneErr = validatePhone(form.guestPhone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    const price = Number(form.actualPricePerNight) || basePrice;
    if (price < minPrice) { setPriceError(`Price must be at least ₦${minPrice.toLocaleString()}/night.`); return; }
    if (Number(form.totalAmountPaid) <= 0) { toast('error', 'Total amount paid must be greater than zero.'); return; }
    setSubmitting(true);
    try {
      await bookingsApi.create({ roomId: form.roomId, guestName: form.guestName, guestPhone: form.guestPhone, guestEmail: form.guestEmail || undefined, numberOfGuests: Number(form.numberOfGuests) || 1, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate, actualPricePerNight: price, discount: Number(form.discount) || 0, totalAmountPaid: Number(form.totalAmountPaid), paymentMethod: form.paymentMethod, bookingSource: form.bookingSource });
      setShowCreate(false);
      toast('success', 'Booking created.');
      fetchBookings();
    } catch (e) { toast('error', e instanceof Error ? e.message : 'Failed to create booking.'); }
    finally { setSubmitting(false); }
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

  const columns: TableProps<BookingResponse>['columns'] = [
    { title: 'Reference', dataIndex: 'bookingReference', key: 'ref', width: 120, render: (_: unknown, r: BookingResponse) => <span className="font-mono text-xs">{r.bookingReference?.slice(-8)}</span> },
    { title: 'Guest', key: 'guest', render: (_: unknown, r: BookingResponse) => (<div><p className="font-medium">{r.guestDetails.name}</p><p className="text-xs opacity-60">{r.guestDetails.phone}</p></div>) },
    { title: 'Room', dataIndex: ['roomId', 'roomNumber'], key: 'room', width: 90, responsive: ['md' as const] },
    { title: 'Dates', key: 'dates', width: 190, render: (_: unknown, r: BookingResponse) => (<span className="text-xs">{format(new Date(r.checkInDate), 'd MMM')} — {format(new Date(r.checkOutDate), 'd MMM')}</span>) },
    { title: 'Status', dataIndex: 'bookingStatus', key: 'status', width: 120, render: (_: unknown, r: BookingResponse) => <Badge status={r.bookingStatus} /> },
    { title: 'Paid', dataIndex: 'totalAmountPaid', key: 'paid', width: 110, align: 'right' as const, render: (_: unknown, r: BookingResponse) => <span className="font-medium">₦{r.totalAmountPaid?.toLocaleString()}</span> },
  ];

  const formValid = form.roomId && form.guestName && form.guestPhone && !phoneError && !priceError && Number(form.totalAmountPaid) > 0;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Management</span></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Bookings</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search reference, guest, phone..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>New Booking</Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded bg-surface-container w-fit">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{ background: statusFilter === tab.value ? 'var(--color-surface-container-lowest)' : 'transparent', color: statusFilter === tab.value ? 'var(--color-on-surface)' : 'var(--color-outline)', boxShadow: statusFilter === tab.value ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
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
          onRow={(record) => ({ onClick: () => setShowDetail(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Create Drawer */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Booking" width={560}
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button htmlType="submit" form="create-booking-form" disabled={!formValid} loading={submitting}>Create Booking</Button></div>}>
        <form id="create-booking-form" onSubmit={handleCreate}>
          <div className="mb-5">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Room</label>
            <Select showSearch optionFilterProp="label" size="lg" className="w-full mt-1" placeholder="Search room..." value={form.roomId || undefined} onChange={(v) => onRoomChange(v)}>
              {rooms.map((r) => (<Option key={r._id} value={r._id} label={`${r.roomNumber} — ${r.roomTypeId?.name}`}>{r.roomNumber} — {r.roomTypeId?.name} (₦{r.roomTypeId?.basePrice?.toLocaleString()}/night)</Option>))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Input size="lg" placeholder="Guest Name" value={form.guestName} onChange={(e) => updateField('guestName', e.target.value)} required />
            <Input size="lg" placeholder="Guest Phone" value={form.guestPhone} onChange={(e) => onPhoneChange(e.target.value)} status={phoneError ? 'error' : undefined} required />
            {phoneError && <p className="col-span-2 -mt-2 text-xs text-error">{phoneError}</p>}
            <Input size="lg" type="email" placeholder="Email (optional)" value={form.guestEmail} onChange={(e) => updateField('guestEmail', e.target.value)} />
            <Input size="lg" type="number" min={1} placeholder="Number of Guests" value={form.numberOfGuests} onChange={(e) => updateField('numberOfGuests', Number(e.target.value))} />
          </div>
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline flex items-center gap-2 mb-1"><Calendar size={12} /> Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-in</span><Input size="lg" type="date" value={form.checkInDate} onChange={(e) => onCheckInChange(e.target.value)} required /></div>
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-out</span><Input size="lg" type="date" value={form.checkOutDate} min={form.checkInDate} onChange={(e) => onCheckOutChange(e.target.value)} required /></div>
            </div>
            <div className="flex items-center gap-2 mt-2"><span className="text-[10px] text-outline uppercase tracking-wide">or</span><button type="button" onClick={() => { updateField('useNights', true); onNightsChange(form.nights); }} className="text-xs text-primary underline cursor-pointer bg-transparent border-none">use nights count</button>{form.useNights && <Input size="sm" type="number" min={1} max={30} value={form.nights} onChange={(e) => onNightsChange(Number(e.target.value))} className="!w-20" />}{form.useNights && <span className="text-xs text-outline">{form.nights === 1 ? 'night' : 'nights'}</span>}</div>
          </div>
          {selectedRoom && (<div className="p-4 mb-5 rounded-lg border border-outline-variant bg-surface-container"><div className="grid grid-cols-3 gap-3"><div><span className="text-[10px] text-outline uppercase tracking-wide">Price / Night</span><Input size="sm" type="number" min={minPrice} value={form.actualPricePerNight || ''} onChange={(e) => onPriceChange(Number(e.target.value))} status={priceError ? 'error' : undefined} /></div><div><span className="text-[10px] text-outline uppercase tracking-wide">Discount (₦)</span><Input size="sm" type="number" min={0} value={form.discount || ''} onChange={(e) => onDiscountChange(Number(e.target.value))} /></div><div><span className="text-[10px] text-outline uppercase tracking-wide">Total Paid</span><Input size="sm" type="number" min={1} value={form.totalAmountPaid || ''} onChange={(e) => updateField('totalAmountPaid', Number(e.target.value))} /></div></div>{priceError && <p className="mt-2 text-xs text-error">{priceError}</p>}<div className="flex flex-wrap gap-4 mt-2 text-[10px] text-outline"><span>Base price: ₦{basePrice.toLocaleString()}</span><span>Min allowed: ₦{minPrice.toLocaleString()}</span><span>Nights: {form.useNights ? form.nights : computedNights}</span><span>Subtotal: ₦{((Number(form.actualPricePerNight) || basePrice) * (form.useNights ? form.nights : computedNights)).toLocaleString()}</span></div></div>)}
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Payment Method</label><div className="grid grid-cols-3 gap-2 mt-1">{paymentMethods.map((pm) => { const Icon = pm.icon; const active = form.paymentMethod === pm.key; return (<button key={pm.key} type="button" onClick={() => updateField('paymentMethod', pm.key)} className="flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all cursor-pointer" style={{ borderColor: active ? 'var(--color-primary)' : 'var(--color-outline-variant)', background: active ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)' }}><Icon size={20} style={{ color: active ? 'var(--color-primary)' : 'var(--color-outline)' }} /><span className="text-xs font-medium" style={{ color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{pm.label}</span><span className="text-[9px] leading-tight" style={{ color: active ? 'var(--color-on-surface-variant)' : 'var(--color-outline)' }}>{pm.desc}</span></button>); })}</div></div>
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Source</label><div className="flex gap-1 mt-1">{bookingSources.map((s) => (<button key={s.key} type="button" onClick={() => updateField('bookingSource', s.key)} className="flex-1 py-2 text-xs font-medium rounded border transition-all cursor-pointer" style={{ borderColor: form.bookingSource === s.key ? 'var(--color-primary)' : 'var(--color-outline-variant)', background: form.bookingSource === s.key ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)', color: form.bookingSource === s.key ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{s.label}</button>))}</div></div>
        </form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer open={!!showDetail} onClose={() => setShowDetail(null)} title="Booking Details" width={480}>
        {showDetail && (<div className="space-y-5">
          <div className="flex items-center justify-between"><div><p className="text-xs text-outline">Reference</p><div className="flex items-center gap-2"><p className="font-mono font-medium">{showDetail.bookingReference}</p><button onClick={() => { navigator.clipboard.writeText(showDetail.bookingReference); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }} className="p-0.5 rounded hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-primary">{copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}</button></div></div><Badge status={showDetail.bookingStatus} /></div>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-outline">Guest</p><p className="font-medium">{showDetail.guestDetails.name}</p><p className="text-xs">{showDetail.guestDetails.phone}</p></div><div><p className="text-xs text-outline">Room</p><p className="font-medium">{showDetail.roomId?.roomNumber}</p><p className="text-xs">{showDetail.roomId?.roomTypeId?.name}</p></div><div><p className="text-xs text-outline">Check-in</p><p>{format(new Date(showDetail.checkInDate), 'EEE d MMM, yyyy')}</p></div><div><p className="text-xs text-outline">Check-out</p><p>{format(new Date(showDetail.checkOutDate), 'EEE d MMM, yyyy')}</p></div><div><p className="text-xs text-outline">Price/Night</p><p className="font-medium">₦{showDetail.actualPricePerNight?.toLocaleString()}</p></div><div><p className="text-xs text-outline">Total Paid</p><p className="font-medium">₦{showDetail.totalAmountPaid?.toLocaleString()}</p></div><div><p className="text-xs text-outline">Payment</p><p>{showDetail.paymentMethod?.replace('_', ' ')}</p></div><div><p className="text-xs text-outline">Source</p><p>{showDetail.bookingSource}</p></div></div>
          <div className="flex gap-3 pt-2">{showDetail.bookingStatus === BookingStatus.Confirmed && <Button size="sm" loading={actionLoading === `checkIn-${showDetail._id}`} onClick={() => handleAction('checkIn', showDetail._id)}>Check In</Button>}{showDetail.bookingStatus === BookingStatus.Checked_In && <Button size="sm" loading={actionLoading === `checkOut-${showDetail._id}`} onClick={() => handleAction('checkOut', showDetail._id)}>Check Out</Button>}{(showDetail.bookingStatus === BookingStatus.Confirmed || showDetail.bookingStatus === BookingStatus.Checked_In) && <Button variant="destructive" size="sm" loading={actionLoading === `cancel-${showDetail._id}`} onClick={() => handleAction('cancel', showDetail._id)}>Cancel</Button>}</div>
        </div>)}
      </Drawer>
    </div>
  );
}
