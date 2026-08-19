import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  ChefHat,
  Truck,
  DoorOpen,
  MapPin,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { menuPublicApi } from '../lib/api';
import { RestaurantOrderStatus } from '@citydenapartments/shared';
import type { RestaurantOrderResponse } from '@citydenapartments/shared';

const STATUS_STEPS = [
  { key: RestaurantOrderStatus.Received, label: 'Order Received', icon: Clock, desc: 'Sent to restaurant' },
  { key: RestaurantOrderStatus.Confirmed, label: 'Kitchen Confirmed', icon: CheckCircle2, desc: 'Accepted by chef' },
  { key: RestaurantOrderStatus.Preparing, label: 'Cooking / Preparing', icon: ChefHat, desc: 'Meal in progress' },
  { key: RestaurantOrderStatus.OutForDelivery, label: 'Out for Delivery', icon: Truck, desc: 'Heading to you' },
  { key: RestaurantOrderStatus.Completed, label: 'Completed', icon: CheckCircle2, desc: 'Delivered & Enjoyed' },
];

export function TrackOrderView({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const [query, setQuery] = useState(() => initialOrderNumber || localStorage.getItem('cda_last_order_ref') || '');
  const [order, setOrder] = useState<RestaurantOrderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrder = useCallback(async (ref: string) => {
    if (!ref.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await menuPublicApi.trackOrder(ref.trim());
      setOrder(data);
    } catch {
      setErrorMessage(`No active order found with reference "${ref}". Check spelling and try again.`);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query) {
      fetchOrder(query);
    }
  }, [fetchOrder]);

  // Determine current step index in progression
  const getStepStatus = (stepKey: string) => {
    if (!order) return 'upcoming';
    if (order.orderStatus === RestaurantOrderStatus.Cancelled) return 'cancelled';

    const orderStatusOrder = [
      RestaurantOrderStatus.Received,
      RestaurantOrderStatus.Confirmed,
      RestaurantOrderStatus.Preparing,
      RestaurantOrderStatus.OutForDelivery,
      RestaurantOrderStatus.Completed,
    ];

    const currentIdx = orderStatusOrder.indexOf(order.orderStatus as any);
    const stepIdx = orderStatusOrder.indexOf(stepKey as any);

    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* Search Order Tracker */}
      <div className="bg-surface rounded-2xl border border-border p-4 space-y-3">
        <h2 className="font-bold font-serif text-base text-foreground">Track Your Order Status</h2>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              type="text"
              placeholder="e.g. CDA-ORD-2026-0001"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-hover text-foreground placeholder:text-muted-foreground rounded-xl border border-border text-xs font-mono font-semibold focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => fetchOrder(query)}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-on-primary font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Track'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 text-rose-500 text-xs font-medium rounded-2xl border border-rose-500/20 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Order Status Display */}
      {order && (
        <div className="space-y-4 animate-in fade-in">
          {/* Order Header Card */}
          <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Order Reference
                </span>
                <h3 className="font-mono font-bold text-base text-foreground mt-0.5">{order.orderNumber}</h3>
              </div>

              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                  order.orderStatus === RestaurantOrderStatus.Completed
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : order.orderStatus === RestaurantOrderStatus.Cancelled
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'bg-primary/10 text-primary border border-primary/20 animate-pulse'
                }`}
              >
                {order.orderStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Destination Info */}
            <div className="p-3 rounded-xl bg-surface-hover flex items-center gap-3 text-xs">
              {order.isGuestLodged ? (
                <>
                  <DoorOpen size={18} className="text-primary shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">Room Delivery</span>
                    <p className="text-[11px] text-muted-foreground">Suite / Room #{order.roomNumber}</p>
                  </div>
                </>
              ) : (
                <>
                  <MapPin size={18} className="text-primary shrink-0" />
                  <div>
                    <span className="font-bold text-foreground">{order.deliveryLocation?.zoneName || 'Home Delivery'}</span>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {order.deliveryLocation?.address || 'Customer Address'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline Steps Tracker */}
          <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Progress</span>

            <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {STATUS_STEPS.map((step, idx) => {
                const status = getStepStatus(step.key);
                const Icon = step.icon;

                return (
                  <div key={idx} className="relative flex items-start gap-3.5 pl-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 z-10 transition-all ${
                        status === 'done'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : status === 'current'
                          ? 'bg-primary text-white ring-4 ring-primary/20 animate-pulse shadow-md'
                          : 'bg-surface border border-border text-muted-foreground'
                      }`}
                    >
                      <Icon size={14} />
                    </div>

                    <div className="flex-1 pt-0.5">
                      <h4
                        className={`text-xs font-bold ${
                          status === 'current'
                            ? 'text-primary'
                            : status === 'done'
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meal Details */}
          <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Items in Order</span>

            <div className="divide-y divide-border/60 text-xs">
              {order.items.map((i, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>{i.name}</span>
                      {i.selectedSize?.name && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded">
                          {i.selectedSize.name}
                        </span>
                      )}
                    </div>
                    {i.selectedOptions && i.selectedOptions.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        {i.selectedOptions.map((o) => o.optionName).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-muted-foreground font-mono text-[11px]">{i.quantity}x </span>
                    <span className="font-mono font-bold text-foreground">₦{i.lineTotal.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center text-sm font-bold">
              <span>Total Amount</span>
              <span className="font-mono text-primary font-extrabold">₦{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
