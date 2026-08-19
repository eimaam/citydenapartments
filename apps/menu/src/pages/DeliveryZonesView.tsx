import { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, DoorOpen, ShieldCheck, RefreshCw } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { menuPublicApi } from '../lib/api';
import type { DeliveryLocationResponse } from '@citydenapartments/shared';

export function DeliveryZonesView() {
  const { activeBranch } = useCart();
  const [locations, setLocations] = useState<DeliveryLocationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBranch) return;
    setLoading(true);
    menuPublicApi
      .getDeliveryLocations(activeBranch._id)
      .then((locs) => setLocations(locs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeBranch]);

  return (
    <div className="pb-28 max-w-md mx-auto px-4 pt-3 space-y-4">
      {/* Header */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Truck size={22} />
          </div>
          <div>
            <h2 className="font-bold font-serif text-lg text-foreground">Delivery Locations & Pricing</h2>
            <p className="text-xs text-muted-foreground">
              Coverage areas for {activeBranch ? activeBranch.name : 'our restaurant'}
            </p>
          </div>
        </div>
      </div>

      {/* Free In-Room Delivery Callout */}
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
        <DoorOpen size={20} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs">
          <h4 className="font-bold text-foreground">Lodged at City Den? Free Room Service</h4>
          <p className="text-muted-foreground mt-0.5">
            If you are staying in any of our rooms or suites, your meal is delivered straight to your room door for{' '}
            <span className="font-bold text-primary">₦0.00</span> delivery charge!
          </p>
        </div>
      </div>

      {/* Zones List */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-hover/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">External Coverage Areas</span>
          <span className="text-[11px] font-mono text-muted-foreground">{locations.length} zones</span>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <RefreshCw size={22} className="animate-spin text-primary" />
            <p className="text-xs">Loading delivery locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No external delivery zones configured for this location yet. Pickup and In-Room orders are available!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {locations.map((loc) => (
              <div key={loc._id} className="p-4 flex items-center justify-between gap-3 hover:bg-surface-hover/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-surface-hover flex items-center justify-center text-muted-foreground">
                    <MapPin size={15} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-foreground">{loc.zoneName}</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> Est. {loc.estimatedDeliveryMinutes || 45} mins
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-primary">
                    ₦{loc.deliveryFee.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quality Badge */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex items-center gap-3 text-xs text-muted-foreground">
        <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
        <span>All meals are packed in tamper-proof thermal packaging to stay fresh and hot upon arrival.</span>
      </div>
    </div>
  );
}
