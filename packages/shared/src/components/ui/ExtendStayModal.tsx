import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import { AlertCircle, CheckCircle2, Wallet, ArrowRight } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select, Option } from './Select';
import { PaymentMethod, DiscountType, type PaymentMethodType, type DiscountTypeType } from '../../types';
import { getMaxManualDiscount } from '../../utils/discounts';

export interface ExtendBookingPayload {
  newCheckOutDate: string;
  additionalAmountPaid: number;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  walletAmountApplied?: number;
  discountType?: DiscountTypeType;
  discountPercentage?: number;
  discountAmount?: number;
  discountReason?: string;
  includeVat?: boolean;
  includeServiceCharge?: boolean;
  vatAmount?: number;
  serviceChargeAmount?: number;
  notes?: string;
}

export interface ExtendStayModalProps {
  open: boolean;
  onClose: () => void;
  booking: {
    _id: string;
    bookingReference: string;
    guestDetails: {
      name: string;
      phone: string;
      email?: string;
    };
    rooms: Array<{
      roomId?: {
        _id?: string;
        roomNumber?: string;
        roomTypeId?: { name?: string };
      } | any;
      actualPricePerNight: number;
      totalForRoom?: number;
    }>;
    checkInDate: string;
    checkOutDate: string;
    totalAmountPaid?: number;
    includeVat?: boolean;
    includeServiceCharge?: boolean;
    discountPercentage?: number;
    discountType?: string;
    customerId?: string;
  } | null;
  customerWalletBalance?: number;
  onExtend: (payload: ExtendBookingPayload) => Promise<any>;
  userRole?: string;
  onSuccess?: (updatedBooking: any) => void;
}

const VAT_RATE = 7.5;
const SERVICE_CHARGE_RATE = 10;

export function ExtendStayModal({
  open,
  onClose,
  booking,
  customerWalletBalance = 0,
  onExtend,
  userRole,
  onSuccess,
}: ExtendStayModalProps) {
  const [extraNights, setExtraNights] = useState<number>(1);
  const [newCheckOutDate, setNewCheckOutDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(PaymentMethod.POS_Card);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [walletAmountToUse, setWalletAmountToUse] = useState<number>(0);
  
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false);
  
  const [discountType, setDiscountType] = useState<DiscountTypeType>(DiscountType.Percentage);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const currentCheckOutDateObj = useMemo(() => {
    if (!booking?.checkOutDate) return new Date();
    return new Date(booking.checkOutDate);
  }, [booking?.checkOutDate]);

  // Initialize state when booking opens
  useEffect(() => {
    if (booking && open) {
      const co = new Date(booking.checkOutDate);
      const initialNewCo = addDays(co, 1);
      setNewCheckOutDate(format(initialNewCo, 'yyyy-MM-dd'));
      setExtraNights(1);
      setIncludeVat(booking.includeVat || false);
      setIncludeServiceCharge(booking.includeServiceCharge || false);
      setDiscountType((booking.discountType as DiscountTypeType) || DiscountType.Percentage);
      setDiscountPercentage(booking.discountPercentage || 0);
      setDiscountAmount(0);
      setDiscountReason('');
      setPaymentMethod(PaymentMethod.POS_Card);
      setPaymentReference('');
      setUseWallet(false);
      setWalletAmountToUse(0);
      setErrorMsg('');
    }
  }, [booking, open]);

  // Handle Quick Night selection
  const handleSelectNights = (n: number) => {
    setExtraNights(n);
    const newCo = addDays(currentCheckOutDateObj, n);
    setNewCheckOutDate(format(newCo, 'yyyy-MM-dd'));
  };

  // Handle custom date change
  const handleDateChange = (val: string) => {
    setNewCheckOutDate(val);
    if (val) {
      const selected = new Date(val);
      const diff = differenceInDays(selected, currentCheckOutDateObj);
      setExtraNights(Math.max(1, diff));
    }
  };

  // Compute rates & totals
  const dailyTotalRate = useMemo(() => {
    if (!booking?.rooms) return 0;
    return booking.rooms.reduce((sum, r) => sum + (Number(r.actualPricePerNight) || 0), 0);
  }, [booking?.rooms]);

  const rawSubtotal = useMemo(() => {
    return dailyTotalRate * Math.max(1, extraNights);
  }, [dailyTotalRate, extraNights]);

  const maxAllowedDiscount = getMaxManualDiscount(userRole);

  const effectiveDiscount = useMemo(() => {
    if (discountType === DiscountType.Percentage) {
      const pct = Math.min(maxAllowedDiscount, Math.max(0, discountPercentage));
      return Math.round((rawSubtotal * pct) / 100);
    }
    return Math.min(rawSubtotal, Math.max(0, discountAmount));
  }, [discountType, discountPercentage, discountAmount, rawSubtotal, maxAllowedDiscount]);

  const netSubtotal = useMemo(() => {
    return Math.max(0, rawSubtotal - effectiveDiscount);
  }, [rawSubtotal, effectiveDiscount]);

  const vatAmount = useMemo(() => {
    return includeVat ? Math.round((netSubtotal * VAT_RATE) / 100) : 0;
  }, [includeVat, netSubtotal]);

  const serviceChargeAmount = useMemo(() => {
    return includeServiceCharge ? Math.round((netSubtotal * SERVICE_CHARGE_RATE) / 100) : 0;
  }, [includeServiceCharge, netSubtotal]);

  const grandTotalDue = useMemo(() => {
    return netSubtotal + vatAmount + serviceChargeAmount;
  }, [netSubtotal, vatAmount, serviceChargeAmount]);

  // Adjust wallet deduction if toggled
  useEffect(() => {
    if (useWallet && customerWalletBalance > 0) {
      setWalletAmountToUse(Math.min(customerWalletBalance, grandTotalDue));
    } else {
      setWalletAmountToUse(0);
    }
  }, [useWallet, customerWalletBalance, grandTotalDue]);

  const cashPosDue = useMemo(() => {
    return Math.max(0, grandTotalDue - walletAmountToUse);
  }, [grandTotalDue, walletAmountToUse]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (extraNights < 1) {
      setErrorMsg('Extension must be for at least 1 additional night.');
      return;
    }

    if (new Date(newCheckOutDate) <= currentCheckOutDateObj) {
      setErrorMsg('New checkout date must be after current checkout date.');
      return;
    }

    if (cashPosDue > 0 && !paymentMethod) {
      setErrorMsg('Please select a payment method for the balance.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);

    try {
      const payload: ExtendBookingPayload = {
        newCheckOutDate: new Date(newCheckOutDate).toISOString(),
        additionalAmountPaid: grandTotalDue,
        paymentMethod: paymentMethod || PaymentMethod.POS_Card,
        paymentReference: paymentReference.trim() || undefined,
        walletAmountApplied: walletAmountToUse > 0 ? walletAmountToUse : undefined,
        discountType,
        discountPercentage: discountType === DiscountType.Percentage ? discountPercentage : undefined,
        discountAmount: effectiveDiscount,
        discountReason: discountReason.trim() || undefined,
        includeVat,
        includeServiceCharge,
        vatAmount,
        serviceChargeAmount,
      };

      const result = await onExtend(payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to extend stay. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  const minSelectableDate = format(addDays(currentCheckOutDateObj, 1), 'yyyy-MM-dd');

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Extend Guest Stay"
      subTitle={`Booking Ref: ${booking.bookingReference} — ${booking.guestDetails.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {errorMsg && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Stay Snapshot */}
        <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/60 text-xs">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-outline-variant/40">
            <span className="text-outline font-medium">Currently Booked Room(s):</span>
            <span className="font-semibold text-on-surface">
              {booking.rooms.map((r) => r.roomId?.roomNumber || 'Room').join(', ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-outline block">Check-in:</span>
              <span className="font-medium">{format(new Date(booking.checkInDate), 'EEE, d MMM yyyy')}</span>
            </div>
            <div>
              <span className="text-outline block">Current Check-out:</span>
              <span className="font-semibold text-primary">{format(currentCheckOutDateObj, 'EEE, d MMM yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Extension Duration Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
            <span>Extension Duration</span>
            <span className="text-xs text-primary font-normal">
              {extraNights} extra night{extraNights > 1 ? 's' : ''}
            </span>
          </label>

          {/* Quick night chips */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 7].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => handleSelectNights(n)}
                className={`py-1.5 px-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                  extraNights === n
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface'
                }`}
              >
                {n < 7 ? `+${n} ${n === 1 ? 'Night' : 'Nights'}` : n === 7 ? '1 Week' : n}
              </button>
            ))}
          </div>

          {/* New Check-out Date input */}
          <div className="pt-1">
            <div className="text-[11px] text-outline mb-1">Or choose a custom new check-out date:</div>
            <Input
              type="date"
              size="sm"
              min={minSelectableDate}
              value={newCheckOutDate}
              onChange={(e:any) => handleDateChange(e.target.value)}
              className="w-full"
              required
            />
          </div>
        </div>

        {/* Rate & Charges Breakdown */}
        <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant/60 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-outline mb-1">
            Incremental Billing Breakdown
          </div>

          <div className="flex justify-between text-xs text-on-surface">
            <span>
              Room Rate (₦{dailyTotalRate.toLocaleString()} / night × {extraNights} night{extraNights > 1 ? 's' : ''}):
            </span>
            <span className="font-medium">₦{rawSubtotal.toLocaleString()}</span>
          </div>

          {/* Discount controls */}
          <div className="pt-2 border-t border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-outline">Apply Extension Discount:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxAllowedDiscount}
                  placeholder="0"
                  value={discountPercentage || ''}
                  onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                  className="w-16 h-7 px-2 text-xs border rounded bg-surface-container-lowest text-right focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-outline">%</span>
              </div>
            </div>
            {effectiveDiscount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                <span>Discount ({discountPercentage}%):</span>
                <span>-₦{effectiveDiscount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Taxes & Charges Toggles */}
          <div className="pt-2 border-t border-outline-variant/40 space-y-1.5">
            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={includeVat}
                  onChange={(e) => setIncludeVat(e.target.checked)}
                  className="rounded text-primary focus:ring-0 cursor-pointer"
                />
                VAT (7.5%)
              </span>
              <span className="font-mono text-outline">
                {includeVat ? `+₦${vatAmount.toLocaleString()}` : '₦0'}
              </span>
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={includeServiceCharge}
                  onChange={(e) => setIncludeServiceCharge(e.target.checked)}
                  className="rounded text-primary focus:ring-0 cursor-pointer"
                />
                Service Charge (10%)
              </span>
              <span className="font-mono text-outline">
                {includeServiceCharge ? `+₦${serviceChargeAmount.toLocaleString()}` : '₦0'}
              </span>
            </label>
          </div>

          {/* Grand total due */}
          <div className="pt-2 border-t border-outline-variant flex justify-between items-center">
            <span className="text-xs font-bold text-on-surface">Total Extension Amount Due:</span>
            <span className="text-base font-extrabold text-primary">
              ₦{grandTotalDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Customer Wallet Application if available */}
        {customerWalletBalance > 0 && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Wallet size={14} />
                Customer Wallet Balance Available
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                ₦{customerWalletBalance.toLocaleString()}
              </span>
            </div>

            <label className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>Apply wallet balance toward this extension</span>
            </label>

            {useWallet && (
              <div className="flex justify-between text-xs pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                <span>Wallet deduction:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  -₦{walletAmountToUse.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Payment Collection Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-on-surface">
              Payment Collection {walletAmountToUse > 0 ? `(Remaining: ₦${cashPosDue.toLocaleString()})` : ''}
            </label>
          </div>

          {cashPosDue > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-outline mb-1 block">Payment Method</label>
                <Select
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as PaymentMethodType)}
                  size="sm"
                  className="w-full"
                >
                  <Option value={PaymentMethod.POS_Card}>POS Card</Option>
                  <Option value={PaymentMethod.Cash}>Cash</Option>
                  <Option value={PaymentMethod.Bank_Transfer}>Bank Transfer</Option>
                </Select>
              </div>

              <div>
                <label className="text-[11px] text-outline mb-1 block">Payment Ref / Receipt #</label>
                <Input
                  size="sm"
                  placeholder="Optional reference"
                  value={paymentReference}
                  onChange={(e:any) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-surface-container text-xs text-emerald-600 dark:text-emerald-400 rounded flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>Full extension amount covered by customer wallet balance.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting} htmlType="button">
            Cancel
          </Button>
          <Button
            size="sm"
            htmlType="submit"
            loading={submitting}
            icon={<ArrowRight size={14} />}
          >
            Confirm &amp; Extend Stay
          </Button>
        </div>
      </form>
    </Modal>
  );
}
