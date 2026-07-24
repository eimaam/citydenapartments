import { useState, useMemo, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { differenceInDays, addDays, format } from 'date-fns';
import { Calendar, Users, X, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Drawer } from './Drawer';
import { Input } from './Input';
import { Select, Option } from './Select';
import { Button } from './Button';
import { BookingStatus, BookingSource, PaymentMethod, UserRole } from '../../types';
import type { PaymentMethodType, BookingSourceType } from '../../types';
import { getMaxManualDiscount } from '../../utils/discounts';

// ── Types ───────────────────────────────────────────────────

export interface BookingFormRoom {
  roomId: string;
  actualPricePerNight: number;
  maxGuests: number;
}

export interface CustomerResult {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nationality?: string;
  gender?: string;
  dob?: string;
  phone2?: string;
  stateOfOrigin?: string;
  occupation?: string;
  religion?: string;
  totalVisits: number;
  lastVisitDate?: string;
  comingFrom?: string;
  nextDestination?: string;
}

export interface DiscountCodeResult {
  _id: string;
  code: string;
  percentage: number;
}

export interface RoomOption {
  _id: string;
  roomNumber: string;
  roomTypeId?: { _id: string; name?: string } | string;
  maxGuests: number;
  branchId?: string;
}

export interface RoomTypeOption {
  _id: string;
  name: string;
  basePrice: number;
  minPriceAllowed?: number;
}

export interface BookingPayload {
  rooms: Array<{ roomId: string; actualPricePerNight: number; maxGuests: number }>;
  customerId?: string;
  customerPhone?: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  guestAddress: string;
  guestNationality: string;
  guestDob?: string;
  guestPhone2?: string;
  guestComingFrom: string;
  guestStateOfOrigin: string;
  guestOccupation: string;
  guestNextDestination: string;
  guestGender: string;
  guestReligion?: string;
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  discountPercentage: number;
  discountCode?: string;
  includeVat: boolean;
  includeServiceCharge: boolean;
  vatAmount: number;
  serviceChargeAmount: number;
  totalAmountPaid: number;
  paymentMethod: string;
  bookingSource: string;
  bookingStatus: string;
}

export interface BookingFormDrawerProps {
  open: boolean;
  onClose: () => void;
  fetchAvailableRooms: (checkIn: string, checkOut: string) => Promise<RoomOption[]>;
  fetchRoomTypes: () => Promise<RoomTypeOption[]>;
  createBooking: (data: BookingPayload) => Promise<any>;
  searchCustomer?: (phone: string) => Promise<CustomerResult[]>;
  validateDiscountCode?: (code: string) => Promise<DiscountCodeResult>;
  onBookingCreated?: (booking: any) => void;
  roomSelection?: 'single' | 'multiple';
  showCustomerLookup?: boolean;
  allowPriceOverride?: boolean;
  initialRoomId?: string;
  states?: Array<{ code: string; name: string }>;
  width?: number;
  userRole?: string;
}

// ── Helpers ──────────────────────────────────────────────────

function toDateStr(d: Date) { return format(d, 'yyyy-MM-dd'); }
function todayStr() { return toDateStr(new Date()); }
function tomorrowStr() { return toDateStr(addDays(new Date(), 1)); }

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned) return null;
  if (!/^(\+234|0)?[789]\d{9}$/.test(cleaned)) return 'Enter a valid Nigerian number (e.g. 0803xxxxxxx).';
  return null;
}

const defaultStates: Array<{ code: string; name: string }> = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
].map((n) => ({ code: n.toUpperCase().replace(/\s/g, '_'), name: n }));

const paymentMethods = [
  { key: PaymentMethod.Cash, label: 'Cash', desc: 'Pay with cash', icon: () => <span>💵</span> },
  { key: PaymentMethod.POS_Card, label: 'POS / Card', desc: 'Card payment', icon: () => <span>💳</span> },
  { key: PaymentMethod.Bank_Transfer, label: 'Transfer', desc: 'Bank transfer', icon: () => <span>🏦</span> },
];

const bookingSources = [
  { key: BookingSource.WalkIn, label: 'Walk-in' },
  { key: BookingSource.Phone, label: 'Phone' },
  { key: BookingSource.Online, label: 'Online' },
];

const Spinner = ({ size = 14 }: { size?: number }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// ── SectionHeader ───────────────────────────────────────────

function SectionHeader({ label, sectionKey, icon: Icon, collapsed, onToggle }: {
  label: string; sectionKey: string; icon?: any; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle}
      className="text-xs font-bold tracking-[0.1em] uppercase text-outline flex items-center gap-2 mb-1 w-full text-left cursor-pointer bg-transparent border-none">
      {Icon && <Icon size={12} />}
      {label}
      {collapsed ? <ChevronRight size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
    </button>
  );
}

// ── Component ───────────────────────────────────────────────

export function BookingFormDrawer({
  open,
  onClose,
  fetchAvailableRooms,
  fetchRoomTypes,
  createBooking,
  searchCustomer,
  validateDiscountCode,
  onBookingCreated,
  roomSelection = 'multiple',
  showCustomerLookup = false,
  allowPriceOverride = false,
  initialRoomId = '',
  states = defaultStates,
  width = 620,
  userRole,
}: BookingFormDrawerProps) {
  const maxManualDiscount = getMaxManualDiscount(userRole);
  // ── Data state ──────────────────────────────────────────────
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeOption[]>([]);

  // ── Form state ──────────────────────────────────────────────
  const [form, setForm] = useState({
    roomId: initialRoomId,
    rooms: [] as BookingFormRoom[],
    guestName: '', guestPhone: '', guestEmail: '',
    guestAddress: '', guestNationality: 'Nigerian', guestDob: '', guestPhone2: '',
    guestComingFrom: '', guestStateOfOrigin: '', guestOccupation: '',
    guestNextDestination: '', guestGender: '', guestReligion: '',
    numberOfGuests: 1,
    checkInDate: todayStr(), nights: 1, checkOutDate: tomorrowStr(), useNights: true,
    actualPricePerNight: 0, discountPercentage: 0,
    includeVat: false, includeServiceCharge: false,
    paymentMethod: PaymentMethod.Cash as PaymentMethodType,
    bookingSource: BookingSource.WalkIn as BookingSourceType,
  });

  // ── Meta state ──────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Customer lookup
  const [customerSearchPhone, setCustomerSearchPhone] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Discount codes
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<DiscountCodeResult | null>(null);
  const [discountCodeLoading, setDiscountCodeLoading] = useState(false);

  // ── Reset form ──────────────────────────────────────────────
  const resetForm = useCallback((ci?: string, co?: string, roomId?: string) => {
    const checkIn = ci || todayStr();
    const checkOut = co || tomorrowStr();
    setForm({
      roomId: roomId || initialRoomId,
      rooms: [],
      guestName: '', guestPhone: '', guestEmail: '',
      guestAddress: '', guestNationality: 'Nigerian', guestDob: '', guestPhone2: '',
      guestComingFrom: '', guestStateOfOrigin: '', guestOccupation: '',
      guestNextDestination: '', guestGender: '', guestReligion: '',
      numberOfGuests: 1,
      checkInDate: checkIn, nights: 1, checkOutDate: checkOut, useNights: true,
      actualPricePerNight: 0, discountPercentage: 0,
      includeVat: false, includeServiceCharge: false,
      paymentMethod: PaymentMethod.Cash, bookingSource: BookingSource.WalkIn,
    });
    setPhoneError(null);
    setFormErrors({});
    setCustomerSearchPhone('');
    setCustomerResults([]);
    setSelectedCustomer(null);
    setAppliedDiscountCode(null);
    setDiscountCodeInput('');
  }, [initialRoomId]);

  // ── Initialize on open ──────────────────────────────────────
  const initialized = useRef(false);
  useEffect(() => {
    if (!open) { initialized.current = false; return; }
    if (initialized.current) return;
    initialized.current = true;

    const ci = todayStr();
    const co = tomorrowStr();
    resetForm(ci, co, initialRoomId);

    fetchAvailableRooms(ci, co).then(setRooms).catch(() => {});
    fetchRoomTypes().then(setRoomTypes).catch(() => {});
  }, [open, initialRoomId, resetForm, fetchAvailableRooms, fetchRoomTypes]);

  // ── Customer search debounce ────────────────────────────────
  useEffect(() => {
    if (!customerSearchPhone || customerSearchPhone.length < 4 || !searchCustomer) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try { setCustomerResults(await searchCustomer(customerSearchPhone)); }
      catch { /* silent */ }
      finally { setSearchingCustomer(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearchPhone, searchCustomer]);

  // ── Helpers ─────────────────────────────────────────────────
  const updateField = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Computed values ─────────────────────────────────────────
  const computedNights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 1;
    return Math.max(1, differenceInDays(new Date(form.checkOutDate), new Date(form.checkInDate)));
  }, [form.checkInDate, form.checkOutDate]);

  function getRoomTypeId(rt: { _id: string; name?: string } | string | undefined): string | undefined {
    if (rt && typeof rt === 'object') return rt._id;
    if (typeof rt === 'string') return rt;
    return undefined;
  }

  const selectedRoom = useMemo(
    () => rooms.find((r) => r._id === form.roomId),
    [rooms, form.roomId],
  );

  const pricing = useMemo(() => {
    const n = form.useNights ? form.nights : computedNights;
    let sub: number;
    if (roomSelection === 'single') {
      const rt = roomTypes.find((t) => t._id === getRoomTypeId(selectedRoom?.roomTypeId));
      const price = form.actualPricePerNight || rt?.basePrice || 0;
      sub = price * n;
    } else {
      sub = form.rooms.reduce((sum, r) => {
        const room = rooms.find((x) => x._id === r.roomId);
        const rt = roomTypes.find((t) => t._id === getRoomTypeId(room?.roomTypeId));
        const price = r.actualPricePerNight || rt?.basePrice || 0;
        return sum + price * n;
      }, 0);
    }
    const pct = form.discountPercentage || 0;
    const disc = Math.round((sub * pct) / 100);
    const vat = form.includeVat ? Math.round(sub * 7.5 / 100) : 0;
    const sc = form.includeServiceCharge ? Math.round(sub * 10 / 100) : 0;
    return { nights: n, subtotal: sub, discountAmt: disc, vatAmt: vat, scAmt: sc, total: Math.max(0, sub - disc + vat + sc) };
  }, [form.rooms, form.discountPercentage, form.includeVat, form.includeServiceCharge, form.nights, form.useNights, computedNights, rooms, roomTypes, roomSelection, form.actualPricePerNight, selectedRoom]);

  // ── Room management (multi-room) ────────────────────────────
  const addRoom = () => {
    setForm((prev) => ({
      ...prev,
      rooms: [...prev.rooms, { roomId: '', actualPricePerNight: 0, maxGuests: 1 }],
    }));
  };

  const removeRoom = (idx: number) => {
    setForm((prev) => {
      const updated = prev.rooms.filter((_, i) => i !== idx);
      return { ...prev, rooms: updated };
    });
  };

  const updateRoom = (idx: number, field: string, value: unknown) => {
    setForm((prev) => {
      const updated = prev.rooms.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      return { ...prev, rooms: updated };
    });
  };

  const onRoomSelect = (idx: number, roomId: string) => {
    const room = rooms.find((r) => r._id === roomId);
    const rt = roomTypes.find((t) => t._id === getRoomTypeId(room?.roomTypeId));
    const price = rt?.basePrice ?? 0;
    const maxGuests = room?.maxGuests ?? 1;
    setForm((prev) => {
      const updated = prev.rooms.map((r, i) => i === idx ? { ...r, roomId, actualPricePerNight: price, maxGuests } : r);
      return { ...prev, rooms: updated };
    });
  };

  // ── Single room selection ───────────────────────────────────
  const onSingleRoomChange = (roomId: string) => {
    updateField('roomId', roomId);
    if (!roomId) { updateField('actualPricePerNight', 0); return; }
    const room = rooms.find((r) => r._id === roomId);
    const rt = roomTypes.find((t) => t._id === getRoomTypeId(room?.roomTypeId));
    const price = rt?.basePrice ?? 0;
    updateField('actualPricePerNight', price);
  };

  // ── Date changes ────────────────────────────────────────────
  const fetchAvailRooms = useCallback(async (ci: string, co: string) => {
    try { setRooms(await fetchAvailableRooms(ci, co)); }
    catch { /* silent */ }
  }, [fetchAvailableRooms]);

  const onNightsChange = (n: number) => {
    const nights = Math.max(1, n);
    const co = addDays(new Date(form.checkInDate), nights);
    updateField('nights', nights);
    updateField('checkOutDate', toDateStr(co));
    fetchAvailRooms(form.checkInDate, toDateStr(co));
  };

  const onCheckInChange = (date: string) => {
    updateField('checkInDate', date);
    const nights = form.useNights ? form.nights : computedNights;
    const co = addDays(new Date(date), nights);
    updateField('checkOutDate', toDateStr(co));
    fetchAvailRooms(date, toDateStr(co));
  };

  const onCheckOutChange = (date: string) => {
    updateField('checkOutDate', date);
    updateField('useNights', false);
    const nights = Math.max(1, differenceInDays(new Date(date), new Date(form.checkInDate)));
    updateField('nights', nights);
    fetchAvailRooms(form.checkInDate, date);
  };

  // ── Customer lookup ─────────────────────────────────────────
  const onCustomerSearchPhoneChange = (phone: string) => {
    setCustomerSearchPhone(phone);
    setSelectedCustomer(null);
  };

  const selectCustomer = (c: CustomerResult) => {
    setSelectedCustomer(c);
    setCustomerResults([]);
    setCustomerSearchPhone(c.phone);
    updateField('guestName', c.name);
    updateField('guestPhone', c.phone);
    updateField('guestEmail', c.email || '');
    updateField('guestAddress', c.address || '');
    updateField('guestNationality', c.nationality || 'Nigerian');
    updateField('guestDob', c.dob || '');
    updateField('guestPhone2', c.phone2 || '');
    updateField('guestStateOfOrigin', c.stateOfOrigin || '');
    updateField('guestOccupation', c.occupation || '');
    updateField('guestGender', c.gender || '');
    updateField('guestReligion', c.religion || '');
    updateField('guestComingFrom', '');
    updateField('guestNextDestination', '');
    setPhoneError(null);
  };

  // ── Pricing changes ─────────────────────────────────────────
  const onDiscountPctChange = (pct: number) => { updateField('discountPercentage', pct); };
  const onPriceChange = (price: number) => { updateField('actualPricePerNight', price); };
  const onPhoneChange = (phone: string) => { updateField('guestPhone', phone); setPhoneError(validatePhone(phone)); };

  // ── Discount codes ──────────────────────────────────────────
  const applyDiscountCode = async () => {
    if (!discountCodeInput.trim() || !validateDiscountCode) return;
    setDiscountCodeLoading(true);
    try {
      const result = await validateDiscountCode(discountCodeInput.trim());
      setAppliedDiscountCode(result);
      updateField('discountPercentage', result.percentage);
    } catch (e: any) {
      setAppliedDiscountCode(null);
    }
    finally { setDiscountCodeLoading(false); }
  };

  const removeDiscountCode = () => {
    setAppliedDiscountCode(null);
    setDiscountCodeInput('');
    updateField('discountPercentage', 0);
  };

  // ── Submit ──────────────────────────────────────────────────
  const toggleSection = (key: string) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const formValid = roomSelection === 'single'
    ? !!form.roomId && !!form.guestName && !!form.guestPhone && !!form.guestAddress.trim() && !!form.guestNationality.trim() && !phoneError && pricing.total > 0
    : form.rooms.length > 0 && form.rooms.every((r) => r.roomId) && !!form.guestName && !!form.guestPhone && !!form.guestAddress.trim() && !!form.guestNationality.trim() && !phoneError && pricing.total > 0;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.guestAddress.trim()) errs.guestAddress = 'Address is required.';
    if (!form.guestNationality.trim()) errs.guestNationality = 'Nationality is required.';
    if (!appliedDiscountCode && form.discountPercentage > maxManualDiscount) {
      errs.discountPercentage = `Direct discount exceeds limit of ${maxManualDiscount}%.`;
    }
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    const phoneErr = validatePhone(form.guestPhone);
    if (phoneErr) { setPhoneError(phoneErr); return; }

    if (roomSelection === 'multiple' && form.rooms.length === 0) return;
    if (!form.guestGender) return;
    if (!form.guestComingFrom.trim()) return;
    if (!form.guestStateOfOrigin.trim()) return;
    if (!form.guestOccupation.trim()) return;
    if (!form.guestNextDestination.trim()) return;
    if (pricing.total <= 0) return;

    setSubmitting(true);
    try {
      const bookingStatus = form.bookingSource === BookingSource.WalkIn ? BookingStatus.Checked_In : BookingStatus.Reserved;
      const payload: BookingPayload = {
        rooms: roomSelection === 'single'
          ? [{ roomId: form.roomId, actualPricePerNight: Number(form.actualPricePerNight) || 0, maxGuests: selectedRoom?.maxGuests ?? (Number(form.numberOfGuests) || 1) }]
          : form.rooms.map((r) => ({ roomId: r.roomId, actualPricePerNight: r.actualPricePerNight, maxGuests: r.maxGuests })),
        customerId: selectedCustomer?._id || undefined,
        customerPhone: form.guestPhone,
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        guestEmail: form.guestEmail || undefined,
        guestAddress: form.guestAddress,
        guestNationality: form.guestNationality,
        guestDob: form.guestDob || undefined,
        guestPhone2: form.guestPhone2 || undefined,
        guestComingFrom: form.guestComingFrom,
        guestStateOfOrigin: form.guestStateOfOrigin,
        guestOccupation: form.guestOccupation,
        guestNextDestination: form.guestNextDestination,
        guestGender: form.guestGender,
        guestReligion: form.guestReligion || undefined,
        numberOfGuests: Number(form.numberOfGuests) || 1,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        discountPercentage: Number(form.discountPercentage) || 0,
        discountCode: appliedDiscountCode?.code,
        includeVat: form.includeVat,
        includeServiceCharge: form.includeServiceCharge,
        vatAmount: pricing.vatAmt,
        serviceChargeAmount: pricing.scAmt,
        totalAmountPaid: pricing.total,
        paymentMethod: form.paymentMethod,
        bookingSource: form.bookingSource,
        bookingStatus,
      };
      const created = await createBooking(payload);
      onClose();
      setAppliedDiscountCode(null);
      setDiscountCodeInput('');
      onBookingCreated?.(created);
    } catch { /* parent handles */ }
    finally { setSubmitting(false); }
  };

  // ── Render ──────────────────────────────────────────────────
  const roomCount = roomSelection === 'single' ? (form.roomId ? 1 : 0) : form.rooms.length;

  return (
    <Drawer open={open} onClose={onClose} title="New Booking" width={width}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button htmlType="submit" form="create-booking-form" disabled={!formValid} loading={submitting}>Create Booking</Button>
        </div>
      }>
      <form id="create-booking-form" onSubmit={handleCreate}>
        {/* ── Dates ── */}
        <div className="mb-5">
          <SectionHeader label="Dates" sectionKey="dates" collapsed={!!collapsedSections['dates']}
            onToggle={() => toggleSection('dates')} />
          {!collapsedSections['dates'] && <>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-in<span className="text-error ml-0.5">*</span></span><Input size="lg" type="date" value={form.checkInDate} onChange={(e) => onCheckInChange(e.target.value)} required /></div>
              <div><span className="text-[10px] text-outline uppercase tracking-wide">Check-out<span className="text-error ml-0.5">*</span></span><Input size="lg" type="date" value={form.checkOutDate} min={form.checkInDate} onChange={(e) => onCheckOutChange(e.target.value)} required /></div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-outline uppercase tracking-wide">or</span>
              <button type="button" onClick={() => { updateField('useNights', true); onNightsChange(form.nights); }}
                className="text-xs text-primary underline cursor-pointer bg-transparent border-none">use nights count</button>
              {form.useNights && <Input size="sm" type="number" min={1} max={30} value={form.nights} onChange={(e) => onNightsChange(Number(e.target.value))} className="!w-20" />}
              {form.useNights && <span className="text-xs text-outline">{form.nights === 1 ? 'night' : 'nights'}</span>}
            </div>
          </>}
        </div>

        {/* ── Rooms ── */}
        <div className="mb-5">
          <SectionHeader label={`${roomSelection === 'single' ? 'Room' : `Rooms (${roomCount})`} *`}
            sectionKey="room" collapsed={!!collapsedSections['room']} onToggle={() => toggleSection('room')} />
          {!collapsedSections['room'] && <div className="mt-2 space-y-3">
            {roomSelection === 'single' ? (
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wide">Select Room<span className="text-error ml-0.5">*</span></span>
                <Select size="lg" className="w-full mt-1" placeholder="Select room"
                  value={form.roomId || undefined} onChange={(v) => onSingleRoomChange(v)}>
                  {rooms.map((r) => {
                    const rt = roomTypes.find((t) => t._id === getRoomTypeId(r.roomTypeId));
                    return <Option key={r._id} value={r._id}>{r.roomNumber}{rt ? ` — ${rt.name}` : ''}</Option>;
                  })}
                </Select>
                {selectedRoom && (() => {
                  const rt = roomTypes.find((t) => t._id === getRoomTypeId(selectedRoom.roomTypeId));
                  return rt ? (
                    <div className="mt-1 text-[10px] text-outline">Base: ₦{rt.basePrice.toLocaleString()} | Min: ₦{rt.minPriceAllowed?.toLocaleString() || '—'}</div>
                  ) : null;
                })()}
              </div>
            ) : (
              <>
                {form.rooms.map((roomSel, idx) => {
                  const sRoom = rooms.find((r) => r._id === roomSel.roomId);
                  const sType = roomTypes.find((t) => t._id === getRoomTypeId(sRoom?.roomTypeId));
                  return (
                    <div key={idx} className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-outline uppercase tracking-wide">Room {idx + 1}</span>
                        {form.rooms.length > 1 && (
                          <button type="button" onClick={() => removeRoom(idx)}
                            className="text-error hover:text-error/80 cursor-pointer bg-transparent border-none p-0">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select size="lg" className="w-full" placeholder="Select room"
                          value={roomSel.roomId || undefined} onChange={(v) => onRoomSelect(idx, v)}>
                          {rooms.map((r) => {
                            const rt = roomTypes.find((t) => t._id === getRoomTypeId(r.roomTypeId));
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
                      {sType && (
                        <div className="mt-1 text-[10px] text-outline">Base: ₦{sType.basePrice.toLocaleString()} | Min: ₦{sType.minPriceAllowed?.toLocaleString() || '—'}</div>
                      )}
                    </div>
                  );
                })}
                <button type="button" onClick={addRoom}
                  className="w-full py-2 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary-container/10 cursor-pointer bg-transparent">
                  + Add Room
                </button>
              </>
            )}
          </div>}
        </div>

        {/* ── Customer Lookup ── */}
        {showCustomerLookup && (
          <div className="mb-5 p-4 rounded-lg border border-outline-variant/60 bg-surface-container-low/30">
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline flex items-center gap-2 mb-2">
              <Users size={12} /> Returning Customer?
            </label>
            <div className="relative">
              <Input size="lg" placeholder="Search by phone number (min 4 digits)"
                value={customerSearchPhone}
                onChange={(e) => onCustomerSearchPhoneChange(e.target.value)}
                suffix={searchingCustomer ? <Spinner size={14} /> : <Search size={14} className="text-outline" />}
              />
            </div>
            {customerResults.length > 0 && !selectedCustomer && (
              <div className="mt-2 space-y-1.5">
                {customerResults.map((c) => (
                  <button key={c._id} type="button" onClick={() => selectCustomer(c)}
                    className="w-full text-left p-2.5 rounded-lg border border-outline-variant/40 hover:border-primary bg-surface-container-lowest hover:bg-surface-container-high transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-outline">{c.phone}</p></div>
                      <div className="text-right text-[10px] text-outline">
                        <p>{c.totalVisits} visit{c.totalVisits !== 1 ? 's' : ''}</p>
                        {c.lastVisitDate && <p>Last: {format(new Date(c.lastVisitDate), 'd MMM yyyy')}</p>}
                      </div>
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
        )}

        {/* ── Guest Info ── */}
        <div className="mb-5">
          <SectionHeader label="Guest Info" sectionKey="guest" icon={Users}
            collapsed={!!collapsedSections['guest']} onToggle={() => toggleSection('guest')} />
          {!collapsedSections['guest'] && <div className="grid grid-cols-2 gap-4 mt-2">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Guest Name<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="Name of Guest" value={form.guestName} onChange={(e) => updateField('guestName', e.target.value)} required /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone Number<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. 0803xxxxxxx" value={form.guestPhone} onChange={(e) => onPhoneChange(e.target.value)} status={phoneError ? 'error' : undefined} required /></div>
            {phoneError && <p className="col-span-2 -mt-2 text-xs text-error">{phoneError}</p>}
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Email</label><Input size="lg" type="email" placeholder="guestname@email.com" value={form.guestEmail} onChange={(e) => updateField('guestEmail', e.target.value)} /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Number of Guests</label><Input size="lg" type="number" min={1} max={99} placeholder="e.g. 2" value={form.numberOfGuests} onChange={(e) => updateField('numberOfGuests', Number(e.target.value))} /></div>
          </div>}
        </div>

        {/* ── Additional Guest Info ── */}
        <div className="mb-5">
          <SectionHeader label="Additional Guest Info" sectionKey="additional"
            collapsed={!!collapsedSections['additional']} onToggle={() => toggleSection('additional')} />
          {!collapsedSections['additional'] && <div className="mt-2 space-y-3">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Address<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. 12 Main Street" value={form.guestAddress} onChange={(e) => { updateField('guestAddress', e.target.value); setFormErrors((prev) => ({ ...prev, guestAddress: '' })); }} status={formErrors.guestAddress ? 'error' : undefined} /></div>
            {formErrors.guestAddress && <p className="text-xs text-error">{formErrors.guestAddress}</p>}
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Nationality<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Nigerian" value={form.guestNationality} onChange={(e) => { updateField('guestNationality', e.target.value); setFormErrors((prev) => ({ ...prev, guestNationality: '' })); }} status={formErrors.guestNationality ? 'error' : undefined} /></div>
            {formErrors.guestNationality && <p className="text-xs text-error">{formErrors.guestNationality}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Date of Birth</label><Input size="lg" type="date" value={form.guestDob} onChange={(e) => updateField('guestDob', e.target.value)} /></div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Gender<span className="text-error ml-0.5">*</span></label>
                <Select size="lg" className="w-full" placeholder="Select gender" value={form.guestGender || undefined} onChange={(v) => updateField('guestGender', v)}>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                </Select>
              </div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone 2</label><Input size="lg" placeholder="(optional)" value={form.guestPhone2} onChange={(e) => updateField('guestPhone2', e.target.value)} /></div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Coming From<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Lagos" value={form.guestComingFrom} onChange={(e) => updateField('guestComingFrom', e.target.value)} /></div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">State of Origin<span className="text-error ml-0.5">*</span></label>
                <Select showSearch optionFilterProp="children" size="lg" className="w-full" placeholder="Select state" value={form.guestStateOfOrigin || undefined} onChange={(v) => updateField('guestStateOfOrigin', v)}>
                  {states.map((s) => (<Option key={s.code} value={s.name}>{s.name}</Option>))}
                </Select>
              </div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Occupation<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Engineer" value={form.guestOccupation} onChange={(e) => updateField('guestOccupation', e.target.value)} /></div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Next Destination<span className="text-error ml-0.5">*</span></label><Input size="lg" placeholder="e.g. Abuja" value={form.guestNextDestination} onChange={(e) => updateField('guestNextDestination', e.target.value)} /></div>
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Religion</label><Input size="lg" placeholder="(optional)" value={form.guestReligion} onChange={(e) => updateField('guestReligion', e.target.value)} /></div>
            </div>
          </div>}
        </div>

        {/* ── Pricing ── */}
        {roomCount > 0 && (
          <div className="p-4 mb-5 rounded-lg border border-outline-variant bg-surface-container">
            <SectionHeader label="Pricing" sectionKey="pricing"
              collapsed={!!collapsedSections['pricing']} onToggle={() => toggleSection('pricing')} />
            {!collapsedSections['pricing'] && <div className="contents">
              <div className="grid grid-cols-4 gap-3 mt-2">
                {allowPriceOverride && (
                  <div><span className="text-[10px] text-outline uppercase tracking-wide">Price / Night<span className="text-error ml-0.5">*</span></span><Input size="sm" type="number" min={0} value={form.actualPricePerNight || ''} onChange={(e) => onPriceChange(Number(e.target.value))} /></div>
                )}
                <div className={allowPriceOverride ? '' : 'col-span-3'}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-outline uppercase tracking-wide">Discount (%)</span>
                    <span className="text-[9px] text-outline">
                      {appliedDiscountCode ? 'Code Applied' : `Max ${maxManualDiscount}%`}
                    </span>
                  </div>
                  <Input size="sm" type="number" min={0} max={appliedDiscountCode ? 100 : maxManualDiscount} step={1} value={form.discountPercentage || ''} onChange={(e) => onDiscountPctChange(Number(e.target.value))} />
                  {!appliedDiscountCode && form.discountPercentage > maxManualDiscount && (
                    <p className="text-[10px] text-error mt-0.5">Max {maxManualDiscount}% without promo code.</p>
                  )}
                </div>
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
              {roomSelection === 'multiple' && form.rooms.map((r, idx) => {
                const room = rooms.find((x) => x._id === r.roomId);
                const rt = roomTypes.find((t) => t._id === getRoomTypeId(room?.roomTypeId));
                const price = r.actualPricePerNight || rt?.basePrice || 0;
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
              </div>
            </div>}
          </div>
        )}

        {/* ── Payment Method ── */}
        <div className="mb-5">
          <SectionHeader label="Payment Method *" sectionKey="payment"
            collapsed={!!collapsedSections['payment']} onToggle={() => toggleSection('payment')} />
          {!collapsedSections['payment'] && <div className="grid grid-cols-3 gap-2 mt-1">
            {paymentMethods.map((pm) => {
              const active = form.paymentMethod === pm.key;
              return (
                <button key={pm.key} type="button" onClick={() => updateField('paymentMethod', pm.key)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all cursor-pointer"
                  style={{
                    borderColor: active ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                    background: active ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)',
                  }}>
                  <pm.icon />
                  <span className="text-xs font-medium" style={{ color: active ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{pm.label}</span>
                  <span className="text-[9px] leading-tight" style={{ color: active ? 'var(--color-on-surface-variant)' : 'var(--color-outline)' }}>{pm.desc}</span>
                </button>
              );
            })}
          </div>}
        </div>

        {/* ── Source ── */}
        <div className="mb-5">
          <SectionHeader label="Source" sectionKey="source"
            collapsed={!!collapsedSections['source']} onToggle={() => toggleSection('source')} />
          {!collapsedSections['source'] && <div className="flex gap-1 mt-1">
            {bookingSources.map((s) => (
              <button key={s.key} type="button" onClick={() => updateField('bookingSource', s.key)}
                className="flex-1 py-2 text-xs font-medium rounded border transition-all cursor-pointer"
                style={{
                  borderColor: form.bookingSource === s.key ? 'var(--color-primary)' : 'var(--color-outline-variant)',
                  background: form.bookingSource === s.key ? 'var(--color-primary-container)/10' : 'var(--color-surface-container-lowest)',
                  color: form.bookingSource === s.key ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)',
                }}>{s.label}</button>
            ))}
          </div>}
        </div>
      </form>
    </Drawer>
  );
}
