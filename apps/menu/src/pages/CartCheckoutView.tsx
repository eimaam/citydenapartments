import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Minus,
  DoorOpen,
  Truck,
  UtensilsCrossed,
  User,
  Phone,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Building2,
} from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { menuPublicApi } from '../lib/api';
import {
  RestaurantDeliveryType,
  RestaurantPaymentMethod,
} from '@citydenapartments/shared';
import type {
  DeliveryLocationResponse,
  RestaurantOrderResponse,
} from '@citydenapartments/shared';

export function CartCheckoutView({
  onBackToMenu,
  onOrderSuccess,
}: {
  onBackToMenu: () => void;
  onOrderSuccess: (order: RestaurantOrderResponse) => void;
}) {
  const { activeBranch, items, updateQuantity, clearCart, subtotal } = useCart();

  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocationResponse[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Checkout Form State
  const [isGuestLodged, setIsGuestLodged] = useState(true);
  const [roomNumber, setRoomNumber] = useState('');
  const [deliveryType, setDeliveryType] = useState<string>(RestaurantDeliveryType.InRoom);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState('');
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('cda_guest_name') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('cda_guest_phone') || '');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(RestaurantPaymentMethod.PayOnDelivery);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Delivery Locations for external orders
  useEffect(() => {
    if (!activeBranch) return;
    setLoadingLocations(true);
    menuPublicApi
      .getDeliveryLocations(activeBranch._id)
      .then((locs) => {
        setDeliveryLocations(locs || []);
        if (locs && locs.length > 0) setSelectedZoneId(locs[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoadingLocations(false));
  }, [activeBranch]);

  // Delivery Fee Calculation
  const deliveryFee = useMemo(() => {
    if (isGuestLodged) return 0;
    if (deliveryType === RestaurantDeliveryType.Pickup) return 0;
    const matched = deliveryLocations.find((l) => l._id === selectedZoneId);
    return matched ? matched.deliveryFee : 0;
  }, [isGuestLodged, deliveryType, selectedZoneId, deliveryLocations]);

  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activeBranch) {
      setErrorMessage('Please select a branch first');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    const cleanedPhone = customerPhone.trim().replace(/[\s-+]/g, '');
    if (!/^0\d{10}$/.test(cleanedPhone)) {
      setErrorMessage('Phone number must be strictly 11 digits starting with 0 (e.g. 08012345678)');
      return;
    }

    if (isGuestLodged) {
      if (!roomNumber.trim()) {
        setErrorMessage('Please specify your Room Number');
        return;
      }
    } else if (deliveryType === RestaurantDeliveryType.HomeDelivery) {
      if (!selectedZoneId) {
        setErrorMessage('Please select a delivery zone');
        return;
      }
      if (!streetAddress.trim()) {
        setErrorMessage('Please enter your street delivery address');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Save name & phone for future orders
      localStorage.setItem('cda_guest_name', customerName.trim());
      localStorage.setItem('cda_guest_phone', cleanedPhone);

      const payload = {
        branchId: activeBranch._id,
        customer: {
          name: customerName.trim(),
          phone: cleanedPhone,
        },
        isGuestLodged,
        roomNumber: isGuestLodged ? roomNumber.trim() : undefined,
        deliveryType: isGuestLodged ? RestaurantDeliveryType.InRoom : deliveryType,
        deliveryLocation:
          !isGuestLodged && deliveryType === RestaurantDeliveryType.HomeDelivery
            ? {
                zoneId: selectedZoneId,
                address: streetAddress.trim(),
              }
            : undefined,
        orderNotes: orderNotes.trim() || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItem._id,
          selectedSize: i.selectedSize ? { name: i.selectedSize.name, price: i.selectedSize.price } : undefined,
          selectedOptions: i.selectedOptions,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
        paymentMethod,
      };

      const placedOrder = await menuPublicApi.placeOrder(payload);
      clearCart();

      // Save last placed order reference in localStorage
      localStorage.setItem('cda_last_order_ref', placedOrder.orderNumber);

      onOrderSuccess(placedOrder);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
          🛒
        </div>
        <div>
          <h2 className="font-bold text-lg text-foreground">Your cart is empty</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Explore our delicious menu items and add dishes to place an order.
          </p>
        </div>
        <button
          onClick={onBackToMenu}
          className="px-6 py-3 bg-primary hover:bg-primary-dark text-on-primary font-bold text-xs rounded-2xl shadow-sm cursor-pointer transition-all active:scale-95"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-3">
      {/* Top Back Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Menu
        </button>
        <span className="text-xs font-bold font-serif text-foreground">Checkout ({items.length})</span>
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-5 pt-3">
        {/* 1. Ordered Items Summary */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Your Order</span>
            <span className="text-[11px] text-muted-foreground font-mono">{items.length} dishes</span>
          </div>

          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">{item.menuItem.name}</span>
                    {item.selectedSize?.name && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                        {item.selectedSize.name}
                      </span>
                    )}
                  </div>

                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.selectedOptions.map((o) => o.optionName).join(', ')}
                    </p>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[10px] text-amber-500 italic mt-0.5">Note: "{item.specialInstructions}"</p>
                  )}

                  <div className="font-mono font-bold text-foreground mt-1">₦{item.lineTotal.toLocaleString()}</div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center border border-border rounded-xl bg-surface-hover px-1.5 py-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center text-foreground cursor-pointer"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center font-mono font-bold text-xs">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center text-foreground cursor-pointer"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. In-House Guest Question / Delivery Location */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Delivery Method</span>
            <span className="text-[11px] font-semibold text-primary">
              {activeBranch ? activeBranch.name : ''}
            </span>
          </div>

          {/* In-House Lodging Checkbox */}
          <div
            onClick={() => setIsGuestLodged(!isGuestLodged)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
              isGuestLodged
                ? 'bg-primary/10 border-primary text-foreground'
                : 'bg-surface-hover border-border text-muted-foreground'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-md border flex items-center justify-center border-primary bg-primary text-white">
                {isGuestLodged && <CheckCircle2 size={14} />}
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground">
                  I am currently lodged at City Den ({activeBranch?.name.replace('City Den ', '') || 'Apartments'})
                </h4>
                <p className="text-[11px] text-muted-foreground">Free room-service delivery to your room door</p>
              </div>
            </div>
            <DoorOpen size={20} className="text-primary shrink-0" />
          </div>

          {/* If In-House Guest: Room Number Input */}
          {isGuestLodged ? (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Room / Suite Number *</label>
              <input
                type="text"
                placeholder="e.g. Room 102, Penthouse A, Suite 204"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-hover text-foreground placeholder:text-muted-foreground rounded-xl border border-border text-sm font-semibold focus:outline-none focus:border-primary"
              />
            </div>
          ) : (
            /* If External Guest: Choose Pickup vs Home Delivery */
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType(RestaurantDeliveryType.HomeDelivery)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    deliveryType === RestaurantDeliveryType.HomeDelivery
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-surface-hover text-foreground'
                  }`}
                >
                  <Truck size={16} />
                  <span className="text-xs">Home Delivery</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType(RestaurantDeliveryType.Pickup)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                    deliveryType === RestaurantDeliveryType.Pickup
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-surface-hover text-foreground'
                  }`}
                >
                  <UtensilsCrossed size={16} />
                  <span className="text-xs">Pickup (₦0)</span>
                </button>
              </div>

              {deliveryType === RestaurantDeliveryType.HomeDelivery && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Delivery Location / Area *
                    </label>
                    <select
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-hover text-foreground rounded-xl border border-border text-xs font-semibold focus:outline-none focus:border-primary"
                    >
                      {deliveryLocations.map((loc) => (
                        <option key={loc._id} value={loc._id}>
                          {loc.zoneName} — ₦{loc.deliveryFee.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Street Address / Landmarks *
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Plot 412, Aminu Kano Crescent, Beside GTBank..."
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-surface-hover text-foreground placeholder:text-muted-foreground rounded-xl border border-border text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Customer Contact Details */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Contact Info</span>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-hover text-foreground placeholder:text-muted-foreground rounded-xl border border-border text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Phone Number * <span className="text-[10px] text-muted-foreground font-normal">(11 digits, starts with 0)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="08012345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full pl-9 pr-3 py-2 bg-surface-hover text-foreground placeholder:text-muted-foreground rounded-xl border border-border text-xs font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Order Delivery Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Please call before knocking, bring POS machine..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-2 bg-surface-hover text-foreground placeholder:text-muted-foreground rounded-xl border border-border text-xs focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 4. Payment Method Choice */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Payment Preference</span>

          <div className="space-y-2">
            <label
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paymentMethod === RestaurantPaymentMethod.PayOnDelivery
                  ? 'border-primary bg-primary/10 text-foreground font-bold'
                  : 'border-border bg-surface-hover text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="payment"
                  value={RestaurantPaymentMethod.PayOnDelivery}
                  checked={paymentMethod === RestaurantPaymentMethod.PayOnDelivery}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-primary"
                />
                <span className="text-xs">Pay on Delivery (POS Card / Cash)</span>
              </div>
              <Banknote size={16} className="text-primary" />
            </label>

            {isGuestLodged && (
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === RestaurantPaymentMethod.ChargeToRoom
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-border bg-surface-hover text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="payment"
                    value={RestaurantPaymentMethod.ChargeToRoom}
                    checked={paymentMethod === RestaurantPaymentMethod.ChargeToRoom}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-primary"
                  />
                  <span className="text-xs">Charge to Room Folio Bill</span>
                </div>
                <CreditCard size={16} className="text-primary" />
              </label>
            )}

            <label
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paymentMethod === RestaurantPaymentMethod.Transfer
                  ? 'border-primary bg-primary/10 text-foreground font-bold'
                  : 'border-border bg-surface-hover text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="payment"
                  value={RestaurantPaymentMethod.Transfer}
                  checked={paymentMethod === RestaurantPaymentMethod.Transfer}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-primary"
                />
                <span className="text-xs">Direct Bank Transfer</span>
              </div>
              <Building2 size={16} className="text-primary" />
            </label>
          </div>
        </div>

        {/* 5. Pricing Summary */}
        <div className="bg-surface rounded-2xl border border-border p-4 space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Meal Subtotal</span>
            <span className="font-mono">₦{subtotal.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-muted-foreground">
            <span>Delivery Fee</span>
            <span className="font-mono">
              {deliveryFee > 0 ? `₦${deliveryFee.toLocaleString()}` : 'FREE (In-Room)'}
            </span>
          </div>

          <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
            <span>Total Payable</span>
            <span className="font-mono text-primary font-extrabold">₦{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/10 text-rose-500 text-xs font-medium rounded-xl border border-rose-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-on-primary font-bold text-sm rounded-2xl shadow-lg cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
        >
          {submitting ? 'Submitting Order to Kitchen...' : `Confirm & Place Order (₦${totalAmount.toLocaleString()})`}
        </button>
      </form>
    </div>
  );
}
