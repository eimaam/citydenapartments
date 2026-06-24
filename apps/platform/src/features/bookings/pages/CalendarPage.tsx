import { useState, useCallback, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { format, addMonths, subMonths, addDays, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getAllStates } from 'ng-geo-data';
import {
  BookingCalendar,
  Button, Input, Select, Option, Drawer, Modal, Badge,
  BookingStatus, PaymentMethod, BookingSource, RoomStatus,
  BookingReceipt,
  type BookingStatusType, type PaymentMethodType, type BookingSourceType,
  type BranchInfo, type ReceiptBooking
} from '@citydenapartments/shared';
import {
  Plus, Search, Banknote, CreditCard, Building2, Users, Calendar,
  Copy, Check, Printer
} from 'lucide-react';

import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';
import { bookingsApi, type CalendarData, type BookingResponse } from '../api/bookings.api';
import { roomsApi, type RoomResponse } from '../../rooms/api/rooms.api';
import { customersApi, type CustomerResponse } from '../api/customers.api';
import { roomTypesApi, type RoomTypeResponse } from '../../room-types/api/room-types.api';
import { RoomTypeSelector } from '../../../components/ui/RoomTypeSelector';
import { discountCodesApi } from '../../discount-codes/api/discount-codes.api';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

function validatePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned) return null;
  if (!/^(\+234|0)?[789]\d{9}$/.test(cleaned)) return 'Enter a valid Nigerian number (e.g. 0803xxxxxxx).';
  return null;
}

function parseDateIgnoreTimezone(dateStr: string): Date {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

function toDateStr(d: Date) { return format(d, 'yyyy-MM-dd'); }
function todayStr() { return toDateStr(new Date()); }
function tomorrowStr() { return toDateStr(addDays(new Date(), 1)); }

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

export default function CalendarPage() {
  const { user, switchBranch } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const nigeriaStates = useMemo(() => getAllStates(), []);

  // ── Date and Navigation State ──
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data Loading State ──
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');

  // ── Booking Actions (Drawers/Modals) ──
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<BookingResponse | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomResponse[]>([]);
  const [allRoomTypes, setAllRoomTypes] = useState<RoomTypeResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBooking, setReceiptBooking] = useState<ReceiptBooking | null>(null);
  const [receiptBranch, setReceiptBranch] = useState<BranchInfo | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // ── Create Booking Form State ──
  const [form, setForm] = useState<{
    roomId: string; guestName: string; guestPhone: string; guestEmail: string;
    guestAddress: string; guestNationality: string; guestDob: string; guestPhone2: string;
    guestComingFrom: string; guestStateOfOrigin: string; guestOccupation: string;
    guestNextDestination: string; guestGender: string; guestReligion: string;
    numberOfGuests: number; checkInDate: string; nights: number; checkOutDate: string;
    useNights: boolean; actualPricePerNight: number;
    discountPercentage: number; totalAmountPaid: number;
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

  // ── Customer Search State ──
  const [customerSearchPhone, setCustomerSearchPhone] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerResponse[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<{ _id: string; code: string; percentage: number } | null>(null);
  const [discountCodeLoading, setDiscountCodeLoading] = useState(false);

  // ── Fetching Data ──
  const fetchCalendar = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      setData(await bookingsApi.calendar(y, m));
    } catch {
      toast('error', 'Failed to load calendar.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month, user?.activeBranchId, fetchCalendar]);

  useEffect(() => {
    api.get<{ items: Branch[] }>('/branches')
      .then((res) => setBranches(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user && !user.activeBranchId && user.allowedBranches.length > 0) {
      switchBranch(user.allowedBranches[0]).catch(() => {});
    }
  }, [user, switchBranch]);

  // ── Customer Search (debounced) ──
  useEffect(() => {
    if (!customerSearchPhone || customerSearchPhone.length < 4) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        setCustomerResults(await customersApi.search(customerSearchPhone));
      } catch {
        // silently fail
      } finally {
        setSearchingCustomer(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearchPhone]);

  // ── Active Branch Helpers ──
  const userBranches = useMemo(() => {
    const allowed = user?.allowedBranches ?? [];
    return branches.filter((b) => allowed.includes(b._id));
  }, [branches, user?.allowedBranches]);

  const handleBranchSwitch = async (branchId: string) => {
    const target = userBranches.find((b) => b._id === branchId);
    try {
      await switchBranch(branchId);
      toast('success', `Switched to ${target?.name ?? 'branch'}.`);
    } catch {
      toast('error', 'Failed to switch branch.');
    }
  };

  // ── Room Types Filtering ──
  const roomTypes = useMemo(() => {
    if (!data?.rooms) return [];
    const typesMap: Record<string, { _id: string; name: string }> = {};
    data.rooms.forEach((r) => {
      if (r.roomTypeId) {
        typesMap[r.roomTypeId._id] = { _id: r.roomTypeId._id, name: r.roomTypeId.name };
      }
    });
    return Object.values(typesMap);
  }, [data?.rooms]);

  const filteredRooms = useMemo(() => {
    if (!data?.rooms) return [];
    if (roomTypeFilter === 'all') return data.rooms;
    return data.rooms.filter((r) => r.roomTypeId?._id === roomTypeFilter);
  }, [data?.rooms, roomTypeFilter]);

  // ── Calculations for selected date ──
  const stats = useMemo(() => {
    if (!data) return { occupancyRate: 0, arrivalsCount: 0, departuresCount: 0, maintenanceCount: 0 };
    
    const totalRooms = data.rooms.length;
    const activeDate = selectedDate;
    
    // Calculate occupied rooms on selectedDate
    const occupiedRooms = new Set<string>();
    data.bookings.forEach((b) => {
      if (b.bookingStatus === BookingStatus.Cancelled) return;
      const ci = parseDateIgnoreTimezone(b.checkInDate);
      const co = parseDateIgnoreTimezone(b.checkOutDate);
      
      const ciDate = new Date(ci.getFullYear(), ci.getMonth(), ci.getDate());
      const coDate = new Date(co.getFullYear(), co.getMonth(), co.getDate());
      const targetDate = new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate());
      
      if (targetDate >= ciDate && targetDate < coDate) {
        if (b.roomId?._id) {
          occupiedRooms.add(b.roomId._id);
        }
      }
    });
    
    const occupiedCount = occupiedRooms.size;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
    
    // Calculate arriving guests
    let arrivalsCount = 0;
    data.bookings.forEach((b) => {
      if (b.bookingStatus === BookingStatus.Cancelled) return;
      const ci = parseDateIgnoreTimezone(b.checkInDate);
      if (
        ci.getFullYear() === activeDate.getFullYear() &&
        ci.getMonth() === activeDate.getMonth() &&
        ci.getDate() === activeDate.getDate()
      ) {
        arrivalsCount += b.numberOfGuests || 1;
      }
    });
    
    // Calculate departing guests
    let departuresCount = 0;
    data.bookings.forEach((b) => {
      if (b.bookingStatus === BookingStatus.Cancelled) return;
      const co = parseDateIgnoreTimezone(b.checkOutDate);
      if (
        co.getFullYear() === activeDate.getFullYear() &&
        co.getMonth() === activeDate.getMonth() &&
        co.getDate() === activeDate.getDate()
      ) {
        departuresCount += b.numberOfGuests || 1;
      }
    });
    
    // Calculate rooms in maintenance
    const maintenanceCount = data.rooms.filter((r) => r.status === RoomStatus.Maintenance).length;
    
    return { occupancyRate, arrivalsCount, departuresCount, maintenanceCount };
  }, [data, selectedDate]);

  // ── Month Navigation Controls ──
  const onPrevMonth = () => {
    const d = subMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const onNextMonth = () => {
    const d = addMonths(new Date(year, month - 1), 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const onToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const handleDateChange = (dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    setSelectedDate(d);
    if (y !== year || m !== month) {
      setYear(y);
      setMonth(m);
    }
  };

  // ── Cell Click & Form Handling ──
  const onCellClick = async (date: Date, room: any, booking?: any) => {
    if (booking) {
      setShowDetail(booking);
    } else {
      const ci = toDateStr(date);
      const co = toDateStr(addDays(date, 1));
      
      setForm({
        roomId: room._id, guestName: '', guestPhone: '', guestEmail: '',
        guestAddress: '', guestNationality: '', guestDob: '', guestPhone2: '',
        guestComingFrom: '', guestStateOfOrigin: '', guestOccupation: '',
        guestNextDestination: '', guestGender: '', guestReligion: '',
        numberOfGuests: 1,
        checkInDate: ci, nights: 1, checkOutDate: co, useNights: true,
        actualPricePerNight: 0, discountPercentage: 0,
        totalAmountPaid: 0,
        paymentMethod: PaymentMethod.Cash, bookingSource: BookingSource.WalkIn,
      });

      setPhoneError(null);
      setPriceError(null);
      setFormErrors({});
      setCustomerSearchPhone('');
      setCustomerResults([]);
      setSelectedCustomer(null);

      try {
        const avail = await roomsApi.available(ci, co);
        if (!avail.some(r => r._id === room._id)) {
          avail.unshift(room);
        }
        setAvailableRooms(avail);
      } catch {
        toast('error', 'Failed to load rooms.');
      }
      setShowCreate(true);
    }
  };

  const openCreate = async () => {
    const ci = todayStr();
    const co = tomorrowStr();
    setForm({
      roomId: '', guestName: '', guestPhone: '', guestEmail: '',
      guestAddress: '', guestNationality: '', guestDob: '', guestPhone2: '',
      guestComingFrom: '', guestStateOfOrigin: '', guestOccupation: '',
      guestNextDestination: '', guestGender: '', guestReligion: '',
      numberOfGuests: 1,
      checkInDate: ci, nights: 1, checkOutDate: co, useNights: true,
      actualPricePerNight: 0, discountPercentage: 0, totalAmountPaid: 0,
      paymentMethod: PaymentMethod.Cash, bookingSource: BookingSource.WalkIn,
    });
    setPhoneError(null);
    setPriceError(null);
    setFormErrors({});
    setCustomerSearchPhone('');
    setCustomerResults([]);
    setSelectedCustomer(null);
    try {
      setAvailableRooms(await roomsApi.available(ci, co));
    } catch {
      toast('error', 'Failed to load rooms.');
    }
    try { const res = await roomTypesApi.list(); setAllRoomTypes(res.items); } catch { /* ok */ }
    setShowCreate(true);
  };

  const updateField = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));

  const selectedRoom = useMemo(() => availableRooms.find((r) => r._id === form.roomId), [availableRooms, form.roomId]);
  
  const computedNights = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 1;
    const diff = Math.max(1, differenceInDays(new Date(form.checkOutDate), new Date(form.checkInDate)));
    return diff;
  }, [form.checkInDate, form.checkOutDate]);

  const onRoomChange = (roomId: string) => {
    updateField('roomId', roomId);
    if (!roomId) {
      updateField('actualPricePerNight', 0);
      updateField('totalAmountPaid', 0);
      setPriceError(null);
      return;
    }
    const room = availableRooms.find((r) => r._id === roomId);
    const roomType = allRoomTypes.find((rt) => rt._id === room?.roomTypeId?._id);
    const price = roomType?.basePrice ?? 0;
    const nights = form.useNights ? form.nights : computedNights;
    updateField('actualPricePerNight', price);
    updateField('totalAmountPaid', Math.max(0, (price * nights) - Math.round((price * nights * form.discountPercentage) / 100)));
    setPriceError(null);
  };

  const fetchAvailableRooms = useCallback(async (ci: string, co: string, currentRoomId?: string) => {
    try {
      const fetched = await roomsApi.available(ci, co);
      setAvailableRooms(fetched);
      if (currentRoomId && !fetched.find((r) => r._id === currentRoomId)) {
        updateField('roomId', '');
        updateField('actualPricePerNight', 0);
        updateField('totalAmountPaid', 0);
      }
    } catch {
      toast('error', 'Failed to load rooms.');
    }
  }, [toast]);

  const recalcTotal = (price: number, pct: number, nights: number) => {
    const discountAmt = Math.round((price * nights * pct) / 100);
    updateField('totalAmountPaid', Math.max(0, (price * nights) - discountAmt));
  };

  const onNightsChange = (n: number) => {
    const nights = Math.max(1, n);
    let co = addDays(new Date(form.checkInDate), nights);
    updateField('nights', nights);
    updateField('checkOutDate', toDateStr(co));
    recalcTotal(Number(form.actualPricePerNight) || 0, form.discountPercentage, nights);
    fetchAvailableRooms(form.checkInDate, toDateStr(co), form.roomId);
  };

  const onCheckInChange = (date: string) => {
    updateField('checkInDate', date);
    const nights = form.useNights ? form.nights : computedNights;
    let co = addDays(new Date(date), nights);
    updateField('checkOutDate', toDateStr(co));
    fetchAvailableRooms(date, toDateStr(co), form.roomId);
  };

  const onCheckOutChange = (date: string) => {
    updateField('checkOutDate', date);
    updateField('useNights', false);
    const nights = Math.max(1, differenceInDays(new Date(date), new Date(form.checkInDate)));
    updateField('nights', nights);
    recalcTotal(Number(form.actualPricePerNight) || 0, form.discountPercentage, nights);
    fetchAvailableRooms(form.checkInDate, date, form.roomId);
  };

  const onPriceChange = (price: number) => {
    updateField('actualPricePerNight', price);
    recalcTotal(price, form.discountPercentage, form.useNights ? form.nights : computedNights);
    setPriceError(null);
  };

  const onDiscountPctChange = (pct: number) => {
    updateField('discountPercentage', pct);
    const nights = form.useNights ? form.nights : computedNights;
    const price = Number(form.actualPricePerNight) || 0;
    recalcTotal(price, pct, nights);
  };

  const onPhoneChange = (phone: string) => {
    updateField('guestPhone', phone);
    setPhoneError(validatePhone(phone));
  };

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

  const onCustomerSearchPhoneChange = (phone: string) => {
    setCustomerSearchPhone(phone);
    setSelectedCustomer(null);
  };

  const selectCustomer = (c: CustomerResponse) => {
    setSelectedCustomer(c);
    setCustomerResults([]);
    setCustomerSearchPhone(c.phone);
    updateField('guestName', c.name);
    updateField('guestPhone', c.phone);
    updateField('guestEmail', c.email || '');
    updateField('guestAddress', c.address);
    updateField('guestNationality', c.nationality);
    updateField('guestDob', c.dob || '');
    updateField('guestPhone2', c.phone2 || '');
    updateField('guestStateOfOrigin', c.stateOfOrigin);
    updateField('guestOccupation', c.occupation);
    updateField('guestGender', c.gender);
    updateField('guestReligion', c.religion || '');
    updateField('guestComingFrom', '');
    updateField('guestNextDestination', '');
    setPhoneError(null);
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
        roomId: form.roomId, customerId: selectedCustomer?._id || undefined, customerPhone: form.guestPhone,
        guestName: form.guestName, guestPhone: form.guestPhone, guestEmail: form.guestEmail || undefined,
        guestAddress: form.guestAddress, guestNationality: form.guestNationality,
        guestDob: form.guestDob || undefined, guestPhone2: form.guestPhone2 || undefined,
        guestComingFrom: form.guestComingFrom, guestStateOfOrigin: form.guestStateOfOrigin,
        guestOccupation: form.guestOccupation, guestNextDestination: form.guestNextDestination,
        guestGender: form.guestGender, guestReligion: form.guestReligion || undefined,
        numberOfGuests: Number(form.numberOfGuests) || 1, checkInDate: form.checkInDate, checkOutDate: form.checkOutDate,
        actualPricePerNight: price, discountPercentage: Number(form.discountPercentage) || 0,
        discountCode: appliedDiscountCode?.code,
        totalAmountPaid: Number(form.totalAmountPaid), paymentMethod: form.paymentMethod, bookingSource: form.bookingSource,
        bookingStatus,
      });
      setShowCreate(false);
      toast('success', 'Booking created.');
      setAppliedDiscountCode(null);
      setDiscountCodeInput('');
      fetchCalendar(year, month);
      openReceipt(created as unknown as ReceiptBooking);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
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
      fetchCalendar(year, month);
    } catch (e) {
      toast('error', e instanceof Error ? e.message : `Failed to ${action}.`);
    } finally {
      setActionLoading('');
    }
  };

  const openReceipt = useCallback(async (booking: ReceiptBooking) => {
    setLoadingReceipt(true);
    setReceiptBooking(booking);
    try {
      const branch = await api.get<BranchInfo>(`/branches/${booking.branchId}`);
      setReceiptBranch(branch);
      setShowReceipt(true);
    } catch {
      toast('error', 'Failed to load branch info.');
    } finally {
      setLoadingReceipt(false);
    }
  }, [toast]);

  const formValid = form.roomId && form.guestName && form.guestPhone && form.guestAddress.trim() && form.guestNationality.trim() && !phoneError && !priceError && Number(form.totalAmountPaid) > 0;

  return (
    <div className="p-6 md:p-8 relative">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Calendar</span>
      </div>

      {/* ── Title & Filter Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Booking Calendar</h1>
        </div>

        {/* Date Navigation & Filters */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Navigation Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-0.5">
              <button
                onClick={onPrevMonth}
                className="px-2.5 py-1.5 text-xs font-bold hover:bg-surface-container-high rounded cursor-pointer select-none"
              >
                &larr;
              </button>
              <span className="px-4 py-1 text-xs font-bold tracking-[0.1em] uppercase text-primary font-sans select-none">
                {format(new Date(year, month - 1), 'MMMM yyyy')}
              </span>
              <button
                onClick={onNextMonth}
                className="px-2.5 py-1.5 text-xs font-bold hover:bg-surface-container-high rounded cursor-pointer select-none"
              >
                &rarr;
              </button>
            </div>
            <button
              onClick={onToday}
              className="text-xs font-bold text-outline hover:text-primary underline cursor-pointer bg-transparent border-none"
            >
              Today
            </button>
          </div>

          {/* Branch Dropdown Selector */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Branch</span>
            <Select size="sm" className="!w-40" value={user?.activeBranchId || undefined} onChange={(v) => handleBranchSwitch(v)}>
              {userBranches.map((b) => (
                <Option key={b._id} value={b._id}>{b.name}</Option>
              ))}
            </Select>
          </div>

          {/* Room Type Selector */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">Room Type</span>
            <Select size="sm" className="!w-40" value={roomTypeFilter} onChange={(v) => setRoomTypeFilter(v)}>
              <Option value="all">All Types</Option>
              {roomTypes.map((t) => (
                <Option key={t._id} value={t._id}>{t.name}</Option>
              ))}
            </Select>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 bg-surface-container-lowest px-4 h-9 rounded-lg border border-outline-variant/60 text-[10px] text-outline font-bold select-none">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#5c4c23]" /> Checked In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#e0ba4d]" /> Reserved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a6a6a6]" /> Checked Out
            </span>
          </div>
        </div>
      </div>

      {/* ── Search Guest & Jump to Date Panel ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 bg-surface-container-low/40 p-4 rounded-xl border border-outline-variant/30">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
          <input
            type="text"
            placeholder="Search guest name on calendar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Jump to Date</span>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-10 px-3.5 text-xs bg-surface-container-lowest border border-outline-variant/50 rounded-lg focus:outline-none focus:border-primary font-medium cursor-pointer"
          />
        </div>
      </div>

      {/* ── Grid Timeline ── */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-24"><Spinner size={20} className="text-primary animate-spin" /></div>
      ) : data ? (
        <BookingCalendar
          year={year}
          month={month}
          rooms={filteredRooms}
          bookings={data.bookings}
          selectedDate={selectedDate}
          searchQuery={searchQuery}
          onCellClick={onCellClick}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <p className="text-outline py-16 text-center font-medium">No data available.</p>
      )}

      {/* ── Dynamic Summary Cards ── */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Occupancy Rate */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 transition-all duration-300 hover:border-outline hover:shadow-ambient">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded flex items-center justify-center bg-[#5c4c23]/10">
                <svg className="w-4 h-4 text-[#5c4c23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-outline font-sans">Occupancy Rate</span>
            </div>
            <p className="text-3xl font-bold text-on-surface mt-1">{stats.occupancyRate}%</p>
          </div>

          {/* Card 2: Arriving Today */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 transition-all duration-300 hover:border-outline hover:shadow-ambient">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded flex items-center justify-center bg-[#e0ba4d]/10">
                <svg className="w-4 h-4 text-[#e0ba4d]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-outline font-sans">Arriving Today</span>
            </div>
            <p className="text-3xl font-bold text-on-surface mt-1">{String(stats.arrivalsCount).padStart(2, '0')} Guests</p>
          </div>

          {/* Card 3: Departing Today */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 transition-all duration-300 hover:border-outline hover:shadow-ambient">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded flex items-center justify-center bg-[#a6a6a6]/15">
                <svg className="w-4 h-4 text-[#a6a6a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-outline font-sans">Departing Today</span>
            </div>
            <p className="text-3xl font-bold text-on-surface mt-1">{String(stats.departuresCount).padStart(2, '0')} Guests</p>
          </div>

          {/* Card 4: In Maintenance */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 transition-all duration-300 hover:border-outline hover:shadow-ambient">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded flex items-center justify-center bg-red-100/60">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-outline font-sans">In Maintenance</span>
            </div>
            <p className="text-3xl font-bold text-on-surface mt-1">{String(stats.maintenanceCount).padStart(2, '0')} Rooms</p>
          </div>
        </div>
      )}

      {/* ── Floating Action Button (Quick Booking) ── */}
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#5c4c23] hover:bg-[#4d401d] text-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-105 cursor-pointer z-40"
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {/* ── In-place Create Booking Drawer ── */}
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
              <RoomTypeSelector rooms={availableRooms} allTypes={allRoomTypes} selectedRoomId={form.roomId} onSelectRoom={(id) => { onRoomChange(id); }} />
            </div>
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
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Guest Name</label><Input size="lg" placeholder="e.g. John Doe" value={form.guestName} onChange={(e) => updateField('guestName', e.target.value)} required /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone Number</label><Input size="lg" placeholder="e.g. 0803xxxxxxx" value={form.guestPhone} onChange={(e) => onPhoneChange(e.target.value)} status={phoneError ? 'error' : undefined} required /></div>
            {phoneError && <p className="col-span-2 -mt-2 text-xs text-error">{phoneError}</p>}
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Email</label><Input size="lg" type="email" placeholder="(optional)" value={form.guestEmail} onChange={(e) => updateField('guestEmail', e.target.value)} /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Number of Guests</label><Input size="lg" type="number" min={1} placeholder="e.g. 2" value={form.numberOfGuests} onChange={(e) => updateField('numberOfGuests', Number(e.target.value))} /></div>
          </div>
          <div className="mb-5"><label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Additional Guest Info</label>
            <div className="mt-2 space-y-3">
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Address</label><Input size="lg" placeholder="e.g. 12 Main Street" value={form.guestAddress} onChange={(e) => { updateField('guestAddress', e.target.value); setFormErrors((prev) => ({ ...prev, guestAddress: '' })); }} status={formErrors.guestAddress ? 'error' : undefined} /></div>
              {formErrors.guestAddress && <p className="text-xs text-error">{formErrors.guestAddress}</p>}
              <div><label className="text-[10px] text-outline uppercase tracking-wide">Nationality</label><Input size="lg" placeholder="e.g. Nigerian" value={form.guestNationality} onChange={(e) => { updateField('guestNationality', e.target.value); setFormErrors((prev) => ({ ...prev, guestNationality: '' })); }} status={formErrors.guestNationality ? 'error' : undefined} /></div>
              {formErrors.guestNationality && <p className="text-xs text-error">{formErrors.guestNationality}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Date of Birth</label><Input size="lg" type="date" value={form.guestDob} onChange={(e) => updateField('guestDob', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Gender</label><Select size="lg" className="w-full" placeholder="Select gender" value={form.guestGender || undefined} onChange={(v) => updateField('guestGender', v)}>
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                </Select></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone 2</label><Input size="lg" placeholder="(optional)" value={form.guestPhone2} onChange={(e) => updateField('guestPhone2', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Coming From</label><Input size="lg" placeholder="e.g. Lagos" value={form.guestComingFrom} onChange={(e) => updateField('guestComingFrom', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">State of Origin</label><Select showSearch optionFilterProp="children" size="lg" className="w-full" placeholder="Select state" value={form.guestStateOfOrigin || undefined} onChange={(v) => updateField('guestStateOfOrigin', v)}>
                  {nigeriaStates.map((s) => (<Option key={s.code} value={s.name}>{s.name}</Option>))}
                </Select></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Occupation</label><Input size="lg" placeholder="e.g. Engineer" value={form.guestOccupation} onChange={(e) => updateField('guestOccupation', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Next Destination</label><Input size="lg" placeholder="e.g. Abuja" value={form.guestNextDestination} onChange={(e) => updateField('guestNextDestination', e.target.value)} /></div>
                <div><label className="text-[10px] text-outline uppercase tracking-wide">Religion</label><Input size="lg" placeholder="(optional)" value={form.guestReligion} onChange={(e) => updateField('guestReligion', e.target.value)} /></div>
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

      {/* ── In-place Booking Details Drawer ── */}
      <Drawer open={!!showDetail} onClose={() => setShowDetail(null)} title="Booking Details" width={480}>
        {showDetail && (<div className="space-y-5">
          <div className="flex items-center justify-between"><div><p className="text-xs text-outline">Reference</p><div className="flex items-center gap-2"><p className="font-mono font-medium">{showDetail.bookingReference}</p><button onClick={() => { navigator.clipboard.writeText(showDetail.bookingReference); setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }} className="p-0.5 rounded hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-primary">{copiedRef ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}</button></div></div><Badge status={showDetail.bookingStatus} /></div>
          <div className="grid grid-cols-2 gap-4 text-sm"><div><p className="text-xs text-outline">Guest</p><p className="font-medium">{showDetail.guestDetails.name}</p><p className="text-xs">{showDetail.guestDetails.phone}</p>{showDetail.guestDetails.email && <p className="text-xs">{showDetail.guestDetails.email}</p>}</div><div><p className="text-xs text-outline">Room</p><p className="font-medium">{showDetail.roomId?.roomNumber}</p><p className="text-xs">{showDetail.roomId?.roomTypeId?.name}</p></div><div><p className="text-xs text-outline">Check-in</p><p>{format(new Date(showDetail.checkInDate), 'EEE d MMM, yyyy')}</p></div><div><p className="text-xs text-outline">Check-out</p><p>{format(new Date(showDetail.checkOutDate), 'EEE d MMM, yyyy')}</p></div><div><p className="text-xs text-outline">Price/Night</p><p className="font-medium">₦{showDetail.actualPricePerNight?.toLocaleString()}</p></div><div><p className="text-xs text-outline">Total Paid</p><p className="font-medium">₦{showDetail.totalAmountPaid?.toLocaleString()}</p></div><div><p className="text-xs text-outline">Payment</p><p>{showDetail.paymentMethod?.replace('_', ' ')}</p></div><div><p className="text-xs text-outline">Source</p><p>{showDetail.bookingSource}</p></div></div>
          <div className="pt-2 border-t border-outline-variant/60"><p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-2">Guest Info</p><div className="grid grid-cols-2 gap-3 text-sm">{[
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
        </div>)}
      </Drawer>

      {/* ── Receipt Modal ── */}
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

