import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { Plus, Search, Banknote, CreditCard, Building2, Users, Calendar, Copy, Check } from 'lucide-react';
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

type StatusFilter = 'all' | BookingStatusType;

const tabs: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
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

// Phone validation: Nigerian format
function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned) return null;
  const ngnPattern = /^(\+234|0)?[789]\d{9}$/;
  if (!ngnPattern.test(cleaned)) return 'Enter a valid Nigerian number (e.g. 0803xxxxxxx).';
  return null;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function today() { return formatDate(new Date()); }
function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return formatDate(d); }

export default function BookingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<BookingResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);

  // Form state
  const [form, setForm] = useState<{
    roomId: string;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    numberOfGuests: number;
    checkInDate: string;
    nights: number;
    checkOutDate: string;
    useNights: boolean;
    actualPricePerNight: number;
    discount: number;
    totalAmountPaid: number;
    paymentMethod: PaymentMethodType;
    bookingSource: BookingSourceType;
  }>({
    roomId: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    numberOfGuests: 1,
    checkInDate: today(),
    nights: 1,
    checkOutDate: tomorrow(),
    useNights: true,
    actualPricePerNight: 0,
    discount: 0,
    totalAmountPaid: 0,
    paymentMethod: PaymentMethod.Cash,
    bookingSource: BookingSource.WalkIn,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const selectedRoom = useMemo(() => rooms.find((r) => r._id === form.roomId), [rooms, form.roomId]);
  const basePrice = selectedRoom?.roomTypeId?.basePrice ?? 0;
  const minPrice = selectedRoom?.roomTypeId?.minPriceAllowed ?? 0;
  const computedNights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 1;
    const diff = Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000);
    return Math.max(1, diff);
  }, [form.checkInDate, form.checkOutDate]);

  // --- API ---
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try { setBookings(await bookingsApi.list()); } catch { toast('error', 'Failed to load bookings.'); }
    finally { setLoading(false); }
  }, [toast, user?.activeBranchId]);
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const openCreate = async () => {
    try { setRooms(await roomsApi.list(RoomStatus.Available)); }
    catch { toast('error', 'Failed to load rooms.'); }
    setForm({ roomId: '', guestName: '', guestPhone: '', guestEmail: '', numberOfGuests: 1, checkInDate: today(), nights: 1, checkOutDate: tomorrow(), useNights: true, actualPricePerNight: 0, discount: 0, totalAmountPaid: 0, paymentMethod: PaymentMethod.Cash, bookingSource: BookingSource.WalkIn });
    setPhoneError(null);
    setPriceError(null);
    setShowCreate(true);
  };

  // --- Form helpers ---
  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onRoomChange = (roomId: string) => {
    const room = rooms.find((r) => r._id === roomId);
    const price = room?.roomTypeId?.basePrice ?? 0;
    const nights = form.useNights ? form.nights : computedNights;
    updateField('roomId', roomId);
    updateField('actualPricePerNight', price);
    updateField('totalAmountPaid', Math.max(0, (price * nights) - form.discount));
    setPriceError(null);
  };

  const onNightsChange = (n: number) => {
    const nights = Math.max(1, n);
    const checkOut = new Date(form.checkInDate);
    checkOut.setDate(checkOut.getDate() + nights);
    updateField('nights', nights);
    updateField('checkOutDate', formatDate(checkOut));
    recalcTotal(Number(form.actualPricePerNight) || basePrice, form.discount, nights);
  };

  const onCheckInChange = (date: string) => {
    updateField('checkInDate', date);
    const nights = form.useNights ? form.nights : computedNights;
    const checkOut = new Date(date);
    checkOut.setDate(checkOut.getDate() + nights);
    updateField('checkOutDate', formatDate(checkOut));
  };

  const onCheckOutChange = (date: string) => {
    updateField('checkOutDate', date);
    updateField('useNights', false);
    const diff = Math.ceil((new Date(date).getTime() - new Date(form.checkInDate).getTime()) / 86400000);
    const nights = Math.max(1, diff);
    updateField('nights', nights);
    recalcTotal(Number(form.actualPricePerNight) || basePrice, form.discount, nights);
  };

  const recalcTotal = (price: number, discount: number, nights: number) => {
    const total = Math.max(0, (price * nights) - discount);
    updateField('totalAmountPaid', total);
  };

  const onPriceChange = (price: number) => {
    updateField('actualPricePerNight', price);
    const nights = form.useNights ? form.nights : computedNights;
    recalcTotal(price, form.discount, nights);
    setPriceError(price < minPrice ? `Minimum allowed price is ₦${minPrice.toLocaleString()}/night.` : null);
  };

  const onDiscountChange = (discount: number) => {
    updateField('discount', discount);
    recalcTotal(Number(form.actualPricePerNight) || basePrice, discount, form.useNights ? form.nights : computedNights);
  };

  const onPhoneChange = (phone: string) => {
    updateField('guestPhone', phone);
    setPhoneError(validatePhone(phone));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const phoneErr = validatePhone(form.guestPhone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    const price = Number(form.actualPricePerNight) || basePrice;
    if (price < minPrice) {
      setPriceError(`Price must be at least ₦${minPrice.toLocaleString()}/night.`);
      return;
    }
    if (Number(form.totalAmountPaid) <= 0) {
      toast('error', 'Total amount paid must be greater than zero.');
      return;
    }
    setSubmitting(true);
    try {
      await bookingsApi.create({
        roomId: form.roomId,
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        guestEmail: form.guestEmail || undefined,
        numberOfGuests: Number(form.numberOfGuests) || 1,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        actualPricePerNight: price,
        discount: Number(form.discount) || 0,
        totalAmountPaid: Number(form.totalAmountPaid),
        paymentMethod: form.paymentMethod,
        bookingSource: form.bookingSource,
      });
      setShowCreate(false);
      toast('success', 'Booking created successfully.');
      fetchBookings();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to create booking.');
    } finally { setSubmitting(false); }
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
    } catch (e) {
      toast('error', e instanceof Error ? e.message : `Failed to ${action}.`);
    } finally { setActionLoading(''); }
  };

  // --- Table data ---
  const filtered = bookings
    .filter((b) => filter === 'all' || b.bookingStatus === filter)
    .filter((b) => !search || b.bookingReference.toLowerCase().includes(search.toLowerCase()) || b.guestDetails.name.toLowerCase().includes(search.toLowerCase()) || b.roomId?.roomNumber?.toLowerCase().includes(search.toLowerCase()));

  const columns: TableProps<BookingResponse>['columns'] = [
    { title: 'Reference', dataIndex: 'bookingReference', key: 'ref', width: 120,
      render: (_: unknown, r: BookingResponse) => <span className="font-mono text-xs">{r.bookingReference?.slice(-8)}</span> },
    { title: 'Guest', key: 'guest',
      render: (_: unknown, r: BookingResponse) => (<div><p className="font-medium">{r.guestDetails.name}</p><p className="text-xs opacity-60">{r.guestDetails.phone}</p></div>) },
    { title: 'Room', dataIndex: ['roomId', 'roomNumber'], key: 'room', width: 90, responsive: ['md' as const] },
    { title: 'Dates', key: 'dates', width: 190,
      render: (_: unknown, r: BookingResponse) => (<span className="text-xs">{new Date(r.checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — {new Date(r.checkOutDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>) },
    { title: 'Status', dataIndex: 'bookingStatus', key: 'status', width: 120,
      render: (_: unknown, r: BookingResponse) => <Badge status={r.bookingStatus} /> },
    { title: 'Paid', dataIndex: 'totalAmountPaid', key: 'paid', width: 110, align: 'right' as const,
      render: (_: unknown, r: BookingResponse) => <span className="font-medium">₦{r.totalAmountPaid?.toLocaleString()}</span> },
  ];

  // --- Form validity ---
  const formValid = form.roomId && form.guestName && form.guestPhone && !phoneError && !priceError && Number(form.totalAmountPaid) > 0;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Management</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Bookings</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search bookings..." prefix={<Search size={14} className="text-outline" />}
            value={search} onChange={(e) => setSearch(e.target.value)} className="!w-56" />
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>New Booking</Button>
        </div>
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
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>
        ) : (
          <Table<BookingResponse> columns={columns} dataSource={filtered} rowKey="_id" pagination={false}
            onRow={(record) => ({ onClick: () => setShowDetail(record), style: { cursor: 'pointer' } })} />
        )}
      </div>

      {/* ============= CREATE DRAWER ============= */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Booking" width={560}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button htmlType="submit" form="create-booking-form" disabled={!formValid} loading={submitting}>Create Booking</Button>
          </div>
        }>
        <form id="create-booking-form" onSubmit={handleCreate}>
          {/* Room selector */}
          <div className="mb-5">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Room</label>
            <Select showSearch optionFilterProp="label" size="lg" className="w-full mt-1"
              placeholder="Search room..." value={form.roomId || undefined} onChange={(v) => onRoomChange(v)}>
              {rooms.map((r) => (
                <Option key={r._id} value={r._id} label={`${r.roomNumber} — ${r.roomTypeId?.name}`}>
                  {r.roomNumber} — {r.roomTypeId?.name} (₦{r.roomTypeId?.basePrice?.toLocaleString()}/night)
                </Option>
              ))}
            </Select>
          </div>

          {/* Guest details */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Input size="lg" placeholder="Guest Name" value={form.guestName}
              onChange={(e) => updateField('guestName', e.target.value)} required />
            <Input size="lg" placeholder="Guest Phone" value={form.guestPhone}
              onChange={(e) => onPhoneChange(e.target.value)} status={phoneError ? 'error' : undefined} required />
            {phoneError && <p className="col-span-2 -mt-2 text-xs text-error">{phoneError}</p>}
            <Input size="lg" type="email" placeholder="Email (optional)" value={form.guestEmail}
              onChange={(e) => updateField('guestEmail', e.target.value)} />
            <Input size="lg" type="number" min={1} placeholder="Number of Guests" value={form.numberOfGuests}
              onChange={(e) => updateField('numberOfGuests', Number(e.target.value))} />
          </div>

          {/* Dates */}
          <div className="mb-5">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline flex items-center gap-2 mb-1">
              <Calendar size={12} /> Dates
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wide">Check-in</span>
                <Input size="lg" type="date" value={form.checkInDate} onChange={(e) => onCheckInChange(e.target.value)} required />
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wide">Check-out</span>
                <Input size="lg" type="date" value={form.checkOutDate} min={form.checkInDate}
                  onChange={(e) => onCheckOutChange(e.target.value)} required />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-outline uppercase tracking-wide">or</span>
              <button type="button" onClick={() => { updateField('useNights', true); onNightsChange(form.nights); }}
                className="text-xs text-primary underline cursor-pointer bg-transparent border-none">use nights count</button>
              {form.useNights && (
                <Input size="sm" type="number" min={1} max={30} value={form.nights}
                  onChange={(e) => onNightsChange(Number(e.target.value))} className="!w-20" />
              )}
              {form.useNights && <span className="text-xs text-outline">{form.nights === 1 ? 'night' : 'nights'}</span>}
            </div>
          </div>

          {/* Pricing */}
          {selectedRoom && (
            <div className="p-4 mb-5 rounded-lg border border-outline-variant bg-surface-container">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-outline uppercase tracking-wide">Price / Night</span>
                  <Input size="sm" type="number" min={minPrice} value={form.actualPricePerNight || ''}
                    onChange={(e) => onPriceChange(Number(e.target.value))} status={priceError ? 'error' : undefined} />
                </div>
                <div>
                  <span className="text-[10px] text-outline uppercase tracking-wide">Discount (₦)</span>
                  <Input size="sm" type="number" min={0} value={form.discount || ''}
                    onChange={(e) => onDiscountChange(Number(e.target.value))} />
                </div>
                <div>
                  <span className="text-[10px] text-outline uppercase tracking-wide">Total Paid</span>
                  <Input size="sm" type="number" min={1} value={form.totalAmountPaid || ''}
                    onChange={(e) => updateField('totalAmountPaid', Number(e.target.value))} />
                </div>
              </div>
              {priceError && <p className="mt-2 text-xs text-error">{priceError}</p>}
              <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-outline">
                <span>Base price: ₦{basePrice.toLocaleString()}</span>
                <span>Min allowed: ₦{minPrice.toLocaleString()}</span>
                <span>Nights: {form.useNights ? form.nights : computedNights}</span>
                <span>Subtotal: ₦{((Number(form.actualPricePerNight) || basePrice) * (form.useNights ? form.nights : computedNights)).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Payment Method</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                const active = form.paymentMethod === pm.key;
                return (
                  <button key={pm.key} type="button"
                    onClick={() => updateField('paymentMethod', pm.key)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-center transition-all cursor-pointer"
                    style={{
                      borderColor: active ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                      background: active ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)',
                    }}>
                    <Icon size={20} style={{ color: active ? 'var(--color-primary)' : 'var(--color-outline)' }} />
                    <span className="text-xs font-medium" style={{ color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{pm.label}</span>
                    <span className="text-[9px] leading-tight" style={{ color: active ? 'var(--color-on-surface-variant)' : 'var(--color-outline)' }}>{pm.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Source</label>
            <div className="flex gap-1 mt-1">
              {bookingSources.map((s) => (
                <button key={s.key} type="button" onClick={() => updateField('bookingSource', s.key)}
                  className="flex-1 py-2 text-xs font-medium rounded border-2 transition-all cursor-pointer"
                  style={{
                    borderColor: form.bookingSource === s.key ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                    background: form.bookingSource === s.key ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)',
                    color: form.bookingSource === s.key ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Drawer>

      {/* ============= DETAIL DRAWER ============= */}
      <Drawer open={!!showDetail} onClose={() => setShowDetail(null)} title="Booking Details" width={480}>
        {showDetail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-outline">Reference</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-medium">{showDetail.bookingReference}</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(showDetail.bookingReference); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }}
                    className="p-0.5 rounded hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-primary">
                    {copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <Badge status={showDetail.bookingStatus} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-outline">Guest</p><p className="font-medium">{showDetail.guestDetails.name}</p><p className="text-xs">{showDetail.guestDetails.phone}</p></div>
              <div><p className="text-xs text-outline">Room</p><p className="font-medium">{showDetail.roomId?.roomNumber}</p><p className="text-xs">{showDetail.roomId?.roomTypeId?.name}</p></div>
              <div><p className="text-xs text-outline">Check-in</p><p>{new Date(showDetail.checkInDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              <div><p className="text-xs text-outline">Check-out</p><p>{new Date(showDetail.checkOutDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
              <div><p className="text-xs text-outline">Price/Night</p><p className="font-medium">₦{showDetail.actualPricePerNight?.toLocaleString()}</p></div>
              <div><p className="text-xs text-outline">Total Paid</p><p className="font-medium">₦{showDetail.totalAmountPaid?.toLocaleString()}</p></div>
              <div><p className="text-xs text-outline">Payment</p><p>{showDetail.paymentMethod?.replace('_', ' ')}</p></div>
              <div><p className="text-xs text-outline">Source</p><p>{showDetail.bookingSource}</p></div>
            </div>
            <div className="flex gap-3 pt-2">
              {showDetail.bookingStatus === BookingStatus.Confirmed && (
                <Button size="sm" loading={actionLoading === `checkIn-${showDetail._id}`} onClick={() => handleAction('checkIn', showDetail._id)}>Check In</Button>
              )}
              {showDetail.bookingStatus === BookingStatus.Checked_In && (
                <Button size="sm" loading={actionLoading === `checkOut-${showDetail._id}`} onClick={() => handleAction('checkOut', showDetail._id)}>Check Out</Button>
              )}
              {(showDetail.bookingStatus === BookingStatus.Confirmed || showDetail.bookingStatus === BookingStatus.Checked_In) && (
                <Button variant="destructive" size="sm" loading={actionLoading === `cancel-${showDetail._id}`} onClick={() => handleAction('cancel', showDetail._id)}>Cancel</Button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
