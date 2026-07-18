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

interface RoomSelection {
  roomId: string;
  actualPricePerNight: number;
  maxGuests: number;
}

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

  const openReceipt = useCallback(async (booking: ReceiptBooking) => {

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

  const formValid = form.rooms.length > 0 && form.rooms.every((r) => r.roomId) && form.guestName && form.guestPhone && form.guestAddress.trim() && form.guestNationality.trim() && !phoneError && pricing.total > 0;

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
          onRow={(record) => ({ onClick: () => setShowDetail(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Create Drawer */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="New Booking" width={620}
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button htmlType="submit" form="create-booking-form" disabled={!formValid} loading={submitting}>Create Booking</Button></div>}>
        <form id="create-booking-form" onSubmit={handleCreate}>
          <div className="mb-5"><SectionHeader label="Dates" sectionKey="dates" icon={Calendar} />
            {!collapsedSections['dates'] && <>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-in<span className="text-error ml-0.5">*</span></span><Input size="lg" type="date" value={form.checkInDate} onChange={(e) => onCheckInChange(e.target.value)} required /></div>
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-out<span className="text-error ml-0.5">*</span></span><Input size="lg" type="date" value={form.checkOutDate} min={form.checkInDate} onChange={(e) => onCheckOutChange(e.target.value)} required /></div>
            </div>
            <div className="flex items-center gap-2 mt-2"><span className="text-[10px] text-outline uppercase tracking-wide">or</span><button type="button" onClick={() => { updateField('useNights', true); onNightsChange(form.nights); }} className="text-xs text-primary underline cursor-pointer bg-transparent border-none">use nights count</button>{form.useNights && <Input size="sm" type="number" min={1} max={30} value={form.nights} onChange={(e) => onNightsChange(Number(e.target.value))} className="!w-20" />}{form.useNights && <span className="text-xs text-outline">{form.nights === 1 ? 'night' : 'nights'}</span>}</div>
            </>}
          </div>
          <div className="mb-5">
            <SectionHeader label={`Rooms (${form.rooms.length}) *`} sectionKey="room" icon={undefined} />
            {!collapsedSections['room'] && <div className="mt-2 space-y-3">
              {form.rooms.map((roomSel, idx) => {
                const selectedRoom = rooms.find((r) => r._id === roomSel.roomId);
                const selectedType = roomTypes.find((rt) => rt._id === selectedRoom?.roomTypeId?._id);
                return (
                  <div key={idx} className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-outline uppercase tracking-wide">Room {idx + 1}</span>
                      {form.rooms.length > 1 && (
                        <button type="button" onClick={() => removeRoom(idx)} className="text-error hover:text-error/80 cursor-pointer bg-transparent border-none p-0">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Select size="lg" className="w-full" placeholder="Select room"
                        value={roomSel.roomId || undefined}
                        onChange={(v) => onRoomSelect(idx, v)}>
                        {rooms.map((r) => {
                          const rt = roomTypes.find((x) => x._id === r.roomTypeId?._id);
                          return <Option key={r._id} value={r._id}>{r.roomNumber}{rt ? ` — ${rt.name}` : ''}</Option>;
                        })}
                      </Select>
                      <div>
                        <span className="text-[10px] text-outline uppercase tracking-wide">Price/Night</span>
                        <Input size="sm" type="number" min={0} value={roomSel.actualPricePerNight || ''}
                          onChange={(e) => { updateRoom(idx, 'actualPricePerNight', Number(e.target.value)); }} />
                      </div>
                      <div>
                        <span className="text-[10px] text-outline uppercase tracking-wide">Max Guests</span>
                        <Input size="sm" type="number" value={roomSel.maxGuests} disabled />
                      </div>
                    </div>
                    {selectedType && (
                      <div className="mt-1 text-[10px] text-outline">Base: ₦{selectedType.basePrice.toLocaleString()} | Min: ₦{selectedType.minPriceAllowed.toLocaleString()}</div>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={addRoom}
                className="w-full py-2 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary-container/10 cursor-pointer bg-transparent">
                + Add Room
              </button>
            </div>}
          </div>
          {/* ── Customer Lookup ── */}
          <div className="mb-5 p-4 rounded-lg border border-outline-variant/60 bg-surface-container-low/30">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline flex items-center gap-2 mb-2"><Users size={12} /> Returning Customer?</label>
            <div className="relative">
              <Input size="lg" placeholder="Search by phone number (min 4 digits)" value={customerSearchPhone} onChange={(e) => onCustomerSearchPhoneChange(e.target.value)} suffix={searchingCustomer ? <Spinner size={14} /> : undefined} />
            </div>
            {customerResults.length > 0 && !selectedCustomer && (
              <div className="mt-2 space-y-1.5">
                {customerResults.map((c) => (
                  <button key={c._id} type="button" onClick={() => selectCustomer(c)}
                    className="w-full text-left p-2.5 rounded-lg border border-outline-variant/40 hover:border-primary bg-surface-container-lowest hover:bg-surface-container-high transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-outline">{c.phone}</p></div>
                      <div className="text-right text-[10px] text-outline"><p>{c.totalVisits} visit{c.totalVisits !== 1 ? 's' : ''}</p>{c.lastVisitDate && <p>Last: {format(new Date(c.lastVisitDate), 'd MMM yyyy')}</p>}</div>
                    </div>
                    <p className="text-[10px] text-outline mt-1">{c.address} · {c.nationality}</p>
                  </button>
                ))}
              </div>
            )}
            {customerSearchPhone.length >= 4 && customerResults.length === 0 && !searchingCustomer && !selectedCustomer && (
              <p className="mt-2 text-xs text-outline">No records found. Fill out the form below to register a new customer.</p>
            )}
            {selectedCustomer && (
              <div className="mt-2 p-2.5 rounded-lg border border-primary/40 bg-primary-container/10">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-on-surface">{selectedCustomer.name}</p><p className="text-xs text-outline">{selectedCustomer.phone}</p></div>
                  <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearchPhone(''); }}
                    className="text-xs text-primary underline cursor-pointer bg-transparent border-none">Change</button>
                </div>
              </div>
            )}
          </div>
          <div className="mb-5">
            <SectionHeader label="Guest Info" sectionKey="guest" icon={Users} />
            {!collapsedSections['guest'] && <div className="grid grid-cols-2 gap-4 mt-2">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Guest Name<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="Name of Guest" value={form.guestName} onChange={(e) => updateField('guestName', e.target.value)} required /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone Number<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. 0803xxxxxxx" value={form.guestPhone} onChange={(e) => onPhoneChange(e.target.value)} status={phoneError ? 'error' : undefined} required /></div>
            {phoneError && <p className="col-span-2 -mt-2 text-xs text-error">{phoneError}</p>}
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Email</label><Input size="lg" type="email" placeholder="guestname@email.com" value={form.guestEmail} onChange={(e) => updateField('guestEmail', e.target.value)} /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Number of Guests</label><Input size="lg" type="number" min={1} max={form.rooms.reduce((s, r) => s + r.maxGuests, 0)} placeholder="e.g. 2" value={form.numberOfGuests} onChange={(e) => updateField('numberOfGuests', Number(e.target.value))} /></div>
          </div>}
          </div>
          <div className="mb-5"><SectionHeader label="Additional Guest Info" sectionKey="additional" icon={undefined} />
            {!collapsedSections['additional'] && <div className="mt-2 space-y-3">
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Address<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. 12 Main Street" value={form.guestAddress} onChange={(e) => { updateField('guestAddress', e.target.value); setFormErrors((prev) => ({ ...prev, guestAddress: '' })); }} status={formErrors.guestAddress ? 'error' : undefined} /></div>
              {formErrors.guestAddress && <p className="text-xs text-error">{formErrors.guestAddress}</p>}
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Nationality<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Nigerian" value={form.guestNationality} onChange={(e) => { updateField('guestNationality', e.target.value); setFormErrors((prev) => ({ ...prev, guestNationality: '' })); }} status={formErrors.guestNationality ? 'error' : undefined} /></div>
              {formErrors.guestNationality && <p className="text-xs text-error">{formErrors.guestNationality}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Date of Birth</label><Input size="lg" type="date" value={form.guestDob} onChange={(e) => updateField('guestDob', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Gender<span className="text-error ml-0.5">*</span></label><Select size="lg" className="w-full" placeholder="Select gender" value={form.guestGender || undefined} onChange={(v) => updateField('guestGender', v)}>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                </Select></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone 2</label><Input size="lg" placeholder="(optional)" value={form.guestPhone2} onChange={(e) => updateField('guestPhone2', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Coming From<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Lagos" value={form.guestComingFrom} onChange={(e) => updateField('guestComingFrom', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">State of Origin<span className="text-error ml-0.5">*</span></label><Select showSearch optionFilterProp="children" size="lg" className="w-full" placeholder="Select state" value={form.guestStateOfOrigin || undefined} onChange={(v) => updateField('guestStateOfOrigin', v)}>
                  {nigeriaStates.map((s) => (<Option key={s.code} value={s.name}>{s.name}</Option>))}
                </Select></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Occupation<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Engineer" value={form.guestOccupation} onChange={(e) => updateField('guestOccupation', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Next Destination<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Abuja" value={form.guestNextDestination} onChange={(e) => updateField('guestNextDestination', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Religion</label><Input size="lg" placeholder="(optional)" value={form.guestReligion} onChange={(e) => updateField('guestReligion', e.target.value)} /></div>
              </div>
            </div>}
          </div>
          {form.rooms.length > 0 && (<div className="p-4 mb-5 rounded-lg border border-outline-variant bg-surface-container">
            <SectionHeader label="Pricing" sectionKey="pricing" icon={undefined} />
            {!collapsedSections['pricing'] && <div className="contents"><div className="grid grid-cols-2 gap-3 mt-2">
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Discount (%)</span><Input size="sm" type="number" min={0} max={100} step={1} value={form.discountPercentage || ''} onChange={(e) => onDiscountPctChange(Number(e.target.value))} /></div>
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Total Paid</span><p className="text-sm font-bold mt-1.5">₦{pricing.total.toLocaleString()}</p></div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.includeVat} onChange={(e) => updateField('includeVat', e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-xs text-outline">VAT (7.5%)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.includeServiceCharge} onChange={(e) => updateField('includeServiceCharge', e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-xs text-outline">Service Charge (10%)</span>
              </label>
            </div>
            <div className="mt-3 p-3 bg-surface-container-lowest rounded border border-outline-variant space-y-1 text-xs">
              <div className="flex justify-between"><span>Subtotal ({pricing.nights} night{pricing.nights > 1 ? 's' : ''})</span><span>₦{pricing.subtotal.toLocaleString()}</span></div>
              {pricing.discountAmt > 0 && <div className="flex justify-between text-error"><span>Discount ({form.discountPercentage}%)</span><span>-₦{pricing.discountAmt.toLocaleString()}</span></div>}
              {pricing.vatAmt > 0 && <div className="flex justify-between text-amber-600"><span>VAT (7.5%)</span><span>+₦{pricing.vatAmt.toLocaleString()}</span></div>}
              {pricing.scAmt > 0 && <div className="flex justify-between text-blue-600"><span>Service Charge (10%)</span><span>+₦{pricing.scAmt.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-on-surface pt-1 border-t border-outline-variant"><span>Total</span><span>₦{pricing.total.toLocaleString()}</span></div>
            </div>
            {form.rooms.map((r, idx) => {
              const room = rooms.find((x) => x._id === r.roomId);
              const roomType = roomTypes.find((rt) => rt._id === room?.roomTypeId?._id);
              const price = r.actualPricePerNight || roomType?.basePrice || 0;
              return (
                <div key={idx} className="flex justify-between text-xs text-outline mt-1">
                  <span>{room?.roomNumber || `Room ${idx + 1}`}: ₦{price.toLocaleString()} × {pricing.nights} night{pricing.nights > 1 ? 's' : ''}</span>
                  <span>₦{(price * pricing.nights).toLocaleString()}</span>
                </div>
              );
            })}
  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-outline-variant/60">
    {appliedDiscountCode ? (
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-mono font-bold text-primary bg-primary-container/20 px-2 py-1 rounded">{appliedDiscountCode.code}</span>
        <span className="text-[10px] text-outline">({appliedDiscountCode.percentage}% off)</span>
      </div>
    ) : (
      <Input size="sm" placeholder="Discount code" value={discountCodeInput}
        onChange={(e) => setDiscountCodeInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') applyDiscountCode(); }} />
    )}
    <Button size="sm" loading={discountCodeLoading} disabled={!!appliedDiscountCode} onClick={applyDiscountCode}>
      {appliedDiscountCode ? 'Applied' : 'Apply'}
    </Button>
    {appliedDiscountCode && (
      <button onClick={removeDiscountCode}
        className="text-xs text-error hover:underline cursor-pointer whitespace-nowrap">Remove</button>
    )}
  </div></div>}</div>)}
          <div className="mb-5"><SectionHeader label="Payment Method *" sectionKey="payment" icon={undefined} />
            {!collapsedSections['payment'] && <div className="grid grid-cols-3 gap-2 mt-1">{paymentMethods.map((pm) => { const Icon = pm.icon; const active = form.paymentMethod === pm.key; return (<button key={pm.key} type="button" onClick={() => updateField('paymentMethod', pm.key)} className="flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all cursor-pointer" style={{ borderColor: active ? 'var(--color-primary)' : 'var(--color-outline-variant)', background: active ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)' }}><Icon size={20} style={{ color: active ? 'var(--color-primary)' : 'var(--color-outline)' }} /><span className="text-xs font-medium" style={{ color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{pm.label}</span><span className="text-[9px] leading-tight" style={{ color: active ? 'var(--color-on-surface-variant)' : 'var(--color-outline)' }}>{pm.desc}</span></button>); })}</div>}</div>
          <div className="mb-5"><SectionHeader label="Source" sectionKey="source" icon={undefined} />
            {!collapsedSections['source'] && <div className="flex gap-1 mt-1">{bookingSources.map((s) => (<button key={s.key} type="button" onClick={() => updateField('bookingSource', s.key)} className="flex-1 py-2 text-xs font-medium rounded border transition-all cursor-pointer" style={{ borderColor: form.bookingSource === s.key ? 'var(--color-primary)' : 'var(--color-outline-variant)', background: form.bookingSource === s.key ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)', color: form.bookingSource === s.key ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{s.label}</button>))}</div>}</div>
        </form>
      </Drawer>

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
