import { useState, useEffect } from 'react';
import { Building2, MapPin, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { menuPublicApi } from '../lib/api';
import type { ActiveBranch } from '../contexts/CartContext';

export function BranchSelectLanding({ onSelectBranch }: { onSelectBranch: () => void }) {
  const { setActiveBranch } = useCart();
  const [branches, setBranches] = useState<ActiveBranch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    menuPublicApi
      .getBranches()
      .then((b) => setBranches(Array.isArray(b) ? b : []))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  const handleChooseBranch = (b: ActiveBranch) => {
    setActiveBranch(b);
    onSelectBranch();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div className="pt-8 space-y-3 text-center">
        <img
          src="/logo.png"
          alt="City Den Apartments"
          className="h-16 w-auto mx-auto object-contain drop-shadow-sm"
        />
        <div>
          <h1 className="text-2xl font-bold font-serif text-foreground tracking-tight">
            City Den Restaurant & Bar
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Order fresh meals, local delicacies, grills, and drinks straight to your room or home
          </p>
        </div>
      </div>

      {/* Branch Cards */}
      <div className="py-8 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Select Your Location
          </span>
          {/* <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
            <Sparkles size={12} /> Live Kitchens
          </span> */}
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <p className="text-xs">Loading available branches...</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="p-6 bg-surface-hover rounded-2xl text-center text-xs text-muted-foreground border border-border">
            No active branches available at the moment.
          </div>
        ) : (
          <div className="space-y-3">
            {branches?.map((branch) => (
              <button
                key={branch._id}
                onClick={() => handleChooseBranch(branch)}
                className="w-full p-5 bg-surface rounded-2xl border border-border hover:border-primary/60 hover:shadow-md transition-all text-left flex items-center justify-between group cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {branch.name}
                    </h3>
                    <p className="w-full text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      {/* <MapPin size={12} className='w-max'/>  */}
                        {branch.city ? `${branch.city}${branch.state ? `, ${branch.state}` : ''} ` : ''}
                        <br />
                        {branch.address}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-surface-hover group-hover:bg-primary group-hover:text-white flex items-center justify-center text-muted-foreground transition-all">
                  <ArrowRight size={14} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-muted-foreground pb-4 border-t border-border pt-4">
        City Den Luxury Apartments & Suites • Room Service & Digital Dining
      </div>
    </div>
  );
}
