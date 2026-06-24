import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from 'react';
import { Plus, Search, Banknote, CreditCard, Building2, Users, Calendar, Copy, Check, Printer } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { getAllStates } from 'ng-geo-data';
import {
  Button, Input, Select, Table, Option, Drawer, Modal, Badge,
  BookingStatus, PaymentMethod, BookingSource, RoomStatus,
  BookingReceipt,
  type BookingStatusType, type PaymentMethodType, type BookingSourceType,
  type BranchInfo, type ReceiptBooking,
} from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';
import { bookingsApi, type BookingResponse, type CreateBookingPayload } from '../api/bookings.api';
import { roomsApi, type RoomResponse } from '../../rooms/api/rooms.api';
import { roomTypesApi, type RoomTypeResponse } from '../../room-types/api/room-types.api';
import { RoomTypeSelector } from '../../../components/ui/RoomTypeSelector';
import { discountCodesApi } from '../../../features/discount-codes/api/discount-codes.api';

const LIMIT = 20;

const statusTabs: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Reserved', value: BookingStatus.Reserved },
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
  const nigeriaStates = useMemo(() => getAllStates(), []);
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeResponse[]>([]);
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<ReceiptBooking | null>(null);
  const [receiptBranch, setReceiptBranch] = useState<BranchInfo | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const [form, setForm] = useState<{
    roomId: string; guestName: string; guestPhone: string; guestEmail: string;
    guestAddress: string; guestNationality: string; guestDob: string; guestPhone2: string;
    guestComingFrom: string; guestStateOfOrigin: string; guestOccupation: string;
    guestNextDestination: string; guestGender: string; guestReligion: string;
    numberOfGuests: number; checkInDate: string; nights: number; checkOutDate: string;
    useNights: boolean; actualPricePerNight: number; discountPercentage: number; totalAmountPaid: number;
    paymentMethod: PaymentMethodType; bookingSource: BookingSourceType;
  }>({
    roomId: '', guestName: '', guestPhone: '', guestEmail: '',
    guestAddress: '', guestNationality: '', guestDob: '', guestPhone2: '',
    guestComingFrom: '', guestStateOfOrigin: '', guestOccupation: '',
    guestNextDestination: '', guestGender: '', guestReligion: '',
    numberOfGuests: 1,
    checkInDate: todayStr(), nights: 1, checkOutDate: tomorrowStr(), useNights: true,
    actualPricePerNight: 0, discountPercentage: 0, totalAmountPaid: 0,
    paymentMethod: PaymentMethod.Cash, bookingSource: BookingSource.WalkIn,
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<{ _id: string; code: string; percentage: number } | null>(null);
  const [discountCodeLoading, setDiscountCodeLoading] = useState(false);

  const selectedRoom = useMemo(() => rooms.find((r) => r._id === form.roomId), [rooms, form.roomId]);
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

  // ── create booking ─────────────────────────────────────────────
  const openCreate = async () => {
    const ci = todayStr();
    const co = tomorrowStr();
    updateField('checkInDate', ci);
    updateField('checkOutDate', co);
    updateField('nights', 1);
    try { setRooms(await roomsApi.available(ci, co)); } catch { toast('error', 'Failed to load rooms.'); }
    try { const res = await roomTypesApi.list(); setRoomTypes(res.items); } catch { /* ok */ }
    setShowCreate(true);
  };

  const updateField = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  const fetchAvailableRooms = useCallback(async (ci: string, co: string, currentRoomId?: string) => {
    try {
      const fetched = await roomsApi.available(ci, co);
      setRooms(fetched);
      if (currentRoomId && !fetched.find((r) => r._id === currentRoomId)) {
        updateField('roomId', '');
        updateField('actualPricePerNight', 0);
        updateField('totalAmountPaid', 0);
      }
    } catch { toast('error', 'Failed to load rooms.'); }
  }, [toast]);

  const onRoomChange = (roomId: string) => {
    updateField('roomId', roomId);
    if (!roomId) {
      updateField('actualPricePerNight', 0);
      updateField('totalAmountPaid', 0);
      setPriceError(null);
      return;
    }
    const room = rooms.find((r) => r._id === roomId);
    const roomType = roomTypes.find((rt) => rt._id === room?.roomTypeId?._id);
    const price = roomType?.basePrice ?? 0;
    const nights = form.useNights ? form.nights : computedNights;
    const pct = form.discountPercentage || 0;
    updateField('actualPricePerNight', price);
    updateField('totalAmountPaid', Math.max(0, (price * nights) - Math.round((price * nights * pct) / 100)));
    setPriceError(null);
  };

  const onNightsChange = (n: number) => { const nights = Math.max(1, n); let co = addDays(new Date(form.checkInDate), nights); updateField('nights', nights); updateField('checkOutDate', toDateStr(co)); recalcTotal(Number(form.actualPricePerNight) || 0, form.discountPercentage, nights); fetchAvailableRooms(form.checkInDate, toDateStr(co), form.roomId); };
  const onCheckInChange = (date: string) => { updateField('checkInDate', date); const nights = form.useNights ? form.nights : computedNights; let co = addDays(new Date(date), nights); updateField('checkOutDate', toDateStr(co)); fetchAvailableRooms(date, toDateStr(co), form.roomId); };
  const onCheckOutChange = (date: string) => { updateField('checkOutDate', date); updateField('useNights', false); const nights = Math.max(1, differenceInDays(new Date(date), new Date(form.checkInDate))); updateField('nights', nights); recalcTotal(Number(form.actualPricePerNight) || 0, form.discountPercentage, nights); fetchAvailableRooms(form.checkInDate, date, form.roomId); };

  const recalcTotal = (price: number, pct: number, nights: number) => {
    const discountAmt = Math.round((price * nights * pct) / 100);
    updateField('totalAmountPaid', Math.max(0, (price * nights) - discountAmt));
  };
  const onPriceChange = (price: number) => { updateField('actualPricePerNight', price); recalcTotal(price, form.discountPercentage, form.useNights ? form.nights : computedNights); setPriceError(null); };
  const onDiscountPctChange = (pct: number) => {
    updateField('discountPercentage', pct);
    const nights = form.useNights ? form.nights : computedNights;
    const price = Number(form.actualPricePerNight) || 0;
    recalcTotal(price, pct, nights);
  };
  const onPhoneChange = (phone: string) => { updateField('guestPhone', phone); setPhoneError(validatePhone(phone)); };

  const applyDiscountCode = async () => {
    if (!discountCodeInput.trim()) { toast('error', 'Enter a discount code.'); return; }
    setDiscountCodeLoading(true);
    try {
      const result = await discountCodesApi.validate(discountCodeInput.trim());
      setAppliedDiscountCode(result);
      updateField('discountPercentage', result.percentage);
      toast('success', `Discount code applied: ${result.percentage}% off`);
    } catch (e: any) { toast('error', e.message); setAppliedDiscountCode(null); }
    finally { setDiscountCodeLoading(false); }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.guestAddress.trim()) errors.guestAddress = 'Address is required.';
    if (!form.guestNationality.trim()) errors.guestNationality = 'Nationality is required.';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const phoneErr = validatePhone(form.guestPhone);
    if (phoneErr) { setPhoneError(phoneErr); return; }
    if (!form.guestGender) { toast('error', 'Gender is required.'); return; }
    if (!form.guestComingFrom.trim()) { toast('error', 'Coming from is required.'); return; }
    if (!form.guestStateOfOrigin.trim()) { toast('error', 'State of origin is required.'); return; }
    if (!form.guestOccupation.trim()) { toast('error', 'Occupation is required.'); return; }
    if (!form.guestNextDestination.trim()) { toast('error', 'Next destination is required.'); return; }
    const price = Number(form.actualPricePerNight) || 0;
    if (Number(form.totalAmountPaid) <= 0) { toast('error', 'Total amount paid must be greater than zero.'); return; }
    setSubmitting(true);
    try {
      const bookingStatus = form.bookingSource === BookingSource.WalkIn ? BookingStatus.Checked_In : BookingStatus.Reserved;
      const created = await bookingsApi.create({
        roomId: form.roomId, guestName: form.guestName, guestPhone: form.guestPhone, guestEmail: form.guestEmail || undefined,
        guestAddress: form.guestAddress, guestNationality: form.guestNationality,
        guestDob: form.guestDob || undefined, guestPhone2: form.guestPhone2 || undefined,
        guestComingFrom: form.guestComingFrom, guestStateOfOrigin: form.guestStateOfOrigin,
        guestOccupation: form.guestOccupation, guestNextDestination: form.guestNextDestination,
        guestGender: form.guestGender, guestReligion: form.guestReligion || undefined,
        numberOfGuests: Number(form.numberOfGuests) || 1, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate,
        actualPricePerNight: price, discountPercentage: Number(form.discountPercentage) || 0,
        discountCode: appliedDiscountCode?.code,
        totalAmountPaid: Number(form.totalAmountPaid), paymentMethod: form.paymentMethod, bookingSource: form.bookingSource, bookingStatus,
      });
      setShowCreate(false);
      toast('success', 'Booking created.');
      setAppliedDiscountCode(null);
      setDiscountCodeInput('');
      fetchBookings();
      openReceipt(created as unknown as ReceiptBooking);
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

  const columns: TableProps<BookingResponse>['columns'] = [
    { title: 'Reference', dataIndex: 'bookingReference', key: 'ref', width: 120, render: (_: unknown, r: BookingResponse) => <span className="font-mono text-xs">{r.bookingReference?.slice(-8)}</span> },
    { title: 'Guest', key: 'guest', render: (_: unknown, r: BookingResponse) => (<div><p className="font-medium">{r.guestDetails.name}</p><p className="text-xs opacity-60">{r.guestDetails.phone}</p></div>) },
    { title: 'Room', dataIndex: ['roomId', 'roomNumber'], key: 'room', width: 90, responsive: ['md' as const] },
    { title: 'Dates', key: 'dates', width: 190, render: (_: unknown, r: BookingResponse) => (<span className="text-xs">{format(new Date(r.checkInDate), 'd MMM')} — {format(new Date(r.checkOutDate), 'd MMM')}</span>) },
    { title: 'Status', dataIndex: 'bookingStatus', key: 'status', width: 120, render: (_: unknown, r: BookingResponse) => <Badge status={r.bookingStatus} /> },
    { title: 'Paid', dataIndex: 'totalAmountPaid', key: 'paid', width: 110, align: 'right' as const, render: (_: unknown, r: BookingResponse) => <span className="font-medium">₦{r.totalAmountPaid?.toLocaleString()}</span> },
  ];

  const formValid = form.roomId && form.guestName && form.guestPhone && form.guestAddress.trim() && form.guestNationality.trim() && !phoneError && !priceError && Number(form.totalAmountPaid) > 0;

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
          onRow={(record) => ({
            onClick: () => {
              setShowDetail(record);
              bookingsApi.get(record._id).then((full) => setShowDetail(full)).catch(() => {});
            },
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Create Drawer */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Booking" width={560}
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button htmlType="submit" form="create-booking-form" disabled={!formValid} loading={submitting}>Create Booking</Button></div>}>
        <form id="create-booking-form" onSubmit={handleCreate}>
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline flex items-center gap-2 mb-1"><Calendar size={12} /> Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-in</span><Input size="lg" type="date" value={form.checkInDate} onChange={(e) => onCheckInChange(e.target.value)} required /></div>
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-out</span><Input size="lg" type="date" value={form.checkOutDate} min={form.checkInDate} onChange={(e) => onCheckOutChange(e.target.value)} required /></div>
            </div>
            <div className="flex items-center gap-2 mt-2"><span className="text-[10px] text-outline uppercase tracking-wide">or</span><button type="button" onClick={() => { updateField('useNights', true); onNightsChange(form.nights); }} className="text-xs text-primary underline cursor-pointer bg-transparent border-none">use nights count</button>{form.useNights && <Input size="sm" type="number" min={1} max={30} value={form.nights} onChange={(e) => onNightsChange(Number(e.target.value))} className="!w-20" />}{form.useNights && <span className="text-xs text-outline">{form.nights === 1 ? 'night' : 'nights'}</span>}</div>
          </div>
          <div className="mb-5">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Room</label>
            <div className="mt-2">
              <RoomTypeSelector rooms={rooms} allTypes={roomTypes} selectedRoomId={form.roomId} onSelectRoom={(id) => { onRoomChange(id); }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Guest Name</label><Input size="lg" placeholder="e.g. John Doe" value={form.guestName} onChange={(e) => updateField('guestName', e.target.value)} required /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Guest Phone</label><Input size="lg" placeholder="e.g. 0803xxxxxxx" value={form.guestPhone} onChange={(e) => onPhoneChange(e.target.value)} status={phoneError ? 'error' : undefined} required /></div>
            {phoneError && <p className="col-span-2 -mt-2 text-xs text-error">{phoneError}</p>}
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Email (Optional)</label><Input size="lg" type="email" placeholder="e.g. johndoe@email.com" value={form.guestEmail} onChange={(e) => updateField('guestEmail', e.target.value)} /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">No. of Guests</label><Input size="lg" type="number" min={1} placeholder="e.g. 1" value={form.numberOfGuests} onChange={(e) => updateField('numberOfGuests', Number(e.target.value))} /></div>
          </div>
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Additional Guest Info</label>
            <div className="mt-2 space-y-3">
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Address</label><Input size="lg" placeholder="e.g. 123 Main Street" value={form.guestAddress} onChange={(e) => { updateField('guestAddress', e.target.value); setFormErrors((prev) => ({ ...prev, guestAddress: '' })); }} status={formErrors.guestAddress ? 'error' : undefined} /></div>
              {formErrors.guestAddress && <p className="text-xs text-error">{formErrors.guestAddress}</p>}
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Nationality</label><Input size="lg" placeholder="e.g. Nigerian" value={form.guestNationality} onChange={(e) => { updateField('guestNationality', e.target.value); setFormErrors((prev) => ({ ...prev, guestNationality: '' })); }} status={formErrors.guestNationality ? 'error' : undefined} /></div>
              {formErrors.guestNationality && <p className="text-xs text-error">{formErrors.guestNationality}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Date of Birth</label><Input size="lg" type="date" placeholder="e.g. 1990-01-01" value={form.guestDob} onChange={(e) => updateField('guestDob', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Gender</label><Select size="lg" className="w-full" placeholder="Select gender" value={form.guestGender || undefined} onChange={(v) => updateField('guestGender', v)}>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                </Select></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone 2 (Optional)</label><Input size="lg" placeholder="e.g. 0805xxxxxxx" value={form.guestPhone2} onChange={(e) => updateField('guestPhone2', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Coming From</label><Input size="lg" placeholder="e.g. Lagos" value={form.guestComingFrom} onChange={(e) => updateField('guestComingFrom', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">State of Origin</label><Select showSearch optionFilterProp="children" size="lg" className="w-full" placeholder="Select state" value={form.guestStateOfOrigin || undefined} onChange={(v) => updateField('guestStateOfOrigin', v)}>
                  {nigeriaStates.map((s) => (<Option key={s.code} value={s.name}>{s.name}</Option>))}
                </Select></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Occupation</label><Input size="lg" placeholder="e.g. Engineer" value={form.guestOccupation} onChange={(e) => updateField('guestOccupation', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Next Destination</label><Input size="lg" placeholder="e.g. Abuja" value={form.guestNextDestination} onChange={(e) => updateField('guestNextDestination', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Religion (Optional)</label><Input size="lg" placeholder="e.g. Christianity" value={form.guestReligion} onChange={(e) => updateField('guestReligion', e.target.value)} /></div>
              </div>
            </div>
          </div>
          {selectedRoom && (<div className="p-4 mb-5 rounded-lg border border-outline-variant bg-surface-container"><div className="grid grid-cols-3 gap-3"><div><span className="text-[10px] text-outline uppercase tracking-wide">Price / Night</span><Input size="sm" type="number" min={0} value={form.actualPricePerNight || ''} onChange={(e) => onPriceChange(Number(e.target.value))} status={priceError ? 'error' : undefined} /></div><div><span className="text-[10px] text-outline uppercase tracking-wide">Discount (%)</span><Input size="sm" type="number" min={0} max={100} step={1} value={form.discountPercentage || ''} onChange={(e) => onDiscountPctChange(Number(e.target.value))} /></div><div><span className="text-[10px] text-outline uppercase tracking-wide">Total Paid</span><Input size="sm" type="number" min={1} value={form.totalAmountPaid || ''} onChange={(e) => updateField('totalAmountPaid', Number(e.target.value))} /></div></div>
  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/60">
    <Input size="sm" placeholder="Discount code" value={discountCodeInput}
      onChange={(e) => setDiscountCodeInput(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') applyDiscountCode(); }} />
    <Button size="sm" loading={discountCodeLoading} disabled={!!appliedDiscountCode} onClick={applyDiscountCode}>
      {appliedDiscountCode ? 'Applied' : 'Apply'}
    </Button>
    {appliedDiscountCode && (
      <button onClick={() => { setAppliedDiscountCode(null); setDiscountCodeInput(''); }}
        className="text-xs text-error hover:underline cursor-pointer whitespace-nowrap">Remove</button>
    )}
  </div>
{priceError && <p className="mt-2 text-xs text-error">{priceError}</p>}<div className="flex flex-wrap gap-4 mt-2 text-[10px] text-outline"><span>Nights: {form.useNights ? form.nights : computedNights}</span><span>Subtotal: ₦{((Number(form.actualPricePerNight) || 0) * (form.useNights ? form.nights : computedNights)).toLocaleString()}</span>{form.discountPercentage > 0 && <span className="text-error">Discount: {form.discountPercentage}%</span>}</div></div>)}
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Payment Method</label><div className="grid grid-cols-3 gap-2 mt-1">{paymentMethods.map((pm) => { const Icon = pm.icon; const active = form.paymentMethod === pm.key; return (<button key={pm.key} type="button" onClick={() => updateField('paymentMethod', pm.key)} className="flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all cursor-pointer" style={{ borderColor: active ? 'var(--color-primary)' : 'var(--color-outline-variant)', background: active ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)' }}><Icon size={20} style={{ color: active ? 'var(--color-primary)' : 'var(--color-outline)' }} /><span className="text-xs font-medium" style={{ color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{pm.label}</span><span className="text-[9px] leading-tight" style={{ color: active ? 'var(--color-on-surface-variant)' : 'var(--color-outline)' }}>{pm.desc}</span></button>); })}</div></div>
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Source</label><div className="flex gap-1 mt-1">{bookingSources.map((s) => (<button key={s.key} type="button" onClick={() => updateField('bookingSource', s.key)} className="flex-1 py-2 text-xs font-medium rounded border transition-all cursor-pointer" style={{ borderColor: form.bookingSource === s.key ? 'var(--color-primary)' : 'var(--color-outline-variant)', background: form.bookingSource === s.key ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)', color: form.bookingSource === s.key ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{s.label}</button>))}</div></div>
        </form>
      </Drawer>

      {/* Detail Drawer */}
      <Drawer open={!!showDetail} onClose={() => setShowDetail(null)} title="Booking Details" width={480}>
        {showDetail && (<div className="space-y-5">
          <div className="flex items-center justify-between"><div><p className="text-xs text-outline">Reference</p><div className="flex items-center gap-2"><p className="font-mono font-medium">{showDetail.bookingReference}</p><button onClick={() => { navigator.clipboard.writeText(showDetail.bookingReference); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }} className="p-0.5 rounded hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-primary">{copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}</button></div></div><Badge status={showDetail.bookingStatus} /></div>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-outline">Guest</p><p className="font-medium">{showDetail.guestDetails.name}</p><p className="text-xs">{showDetail.guestDetails.phone}</p>{showDetail.guestDetails.email && <p className="text-xs">{showDetail.guestDetails.email}</p>}</div><div><p className="text-xs text-outline">Room</p><p className="font-medium">{showDetail.roomId?.roomNumber}</p><p className="text-xs">{showDetail.roomId?.roomTypeId?.name}</p></div><div><p className="text-xs text-outline">Check-in</p><p>{format(new Date(showDetail.checkInDate), 'EEE d MMM, yyyy')}</p></div><div><p className="text-xs text-outline">Check-out</p><p>{format(new Date(showDetail.checkOutDate), 'EEE d MMM, yyyy')}</p></div><div><p className="text-xs text-outline">Price/Night</p><p className="font-medium">₦{showDetail.actualPricePerNight?.toLocaleString()}</p></div><div><p className="text-xs text-outline">Total Paid</p><p className="font-medium">₦{showDetail.totalAmountPaid?.toLocaleString()}</p></div><div><p className="text-xs text-outline">Payment</p><p>{showDetail.paymentMethod?.replace('_', ' ')}</p></div><div><p className="text-xs text-outline">Source</p><p>{showDetail.bookingSource}</p></div></div>
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
          <div className="flex gap-3 pt-2 flex-wrap">{showDetail.bookingStatus === BookingStatus.Checked_In && <Button size="sm" loading={actionLoading === `checkOut-${showDetail._id}`} onClick={() => handleAction('checkOut', showDetail._id)}>Check Out</Button>}{(showDetail.bookingStatus === BookingStatus.Reserved || showDetail.bookingStatus === BookingStatus.Confirmed) && <Button size="sm" loading={actionLoading === `checkIn-${showDetail._id}`} onClick={() => handleAction('checkIn', showDetail._id)}>Check In</Button>}{showDetail.bookingStatus !== BookingStatus.Cancelled && showDetail.bookingStatus !== BookingStatus.Checked_Out && <Button variant="destructive" size="sm" loading={actionLoading === `cancel-${showDetail._id}`} onClick={() => handleAction('cancel', showDetail._id)}>Cancel</Button>}<Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => { setShowDetail(null); openReceipt(showDetail as unknown as ReceiptBooking); }}>Print Receipt</Button></div>

          {/* Status History */}
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
