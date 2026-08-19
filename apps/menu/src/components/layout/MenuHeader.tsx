import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { menuPublicApi } from '../../lib/api';
import type { ActiveBranch } from '../../contexts/CartContext';

export function MenuHeader({ onOpenBranchModal }: { onOpenBranchModal?: () => void }) {
  const { activeBranch, setActiveBranch } = useCart();
  const [branches, setBranches] = useState<ActiveBranch[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    menuPublicApi
      .getBranches()
      .then((b) => setBranches(Array.isArray(b) ? b : []))
      .catch(() => setBranches([]));
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="City Den" className="h-8 w-auto object-contain" />
          <div>
            <h1 className="font-serif font-bold text-sm text-foreground tracking-tight leading-none">
              City Den
            </h1>
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mt-0.5">
              Restaurant & Bar
            </p>
          </div>
        </div>

        {/* Top-Right Location Selector */}
        <div className="relative">
          <button
            onClick={() => (onOpenBranchModal ? onOpenBranchModal() : setDropdownOpen(!dropdownOpen))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/20 transition-all text-xs font-semibold cursor-pointer active:scale-95"
          >
            <MapPin size={13} className="text-primary" />
            <span className="max-w-[120px] truncate">
              {activeBranch ? activeBranch.name.replace('City Den ', '') : 'Select Branch'}
            </span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </button>

          {dropdownOpen && !onOpenBranchModal && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-2xl border border-border shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
                  Choose Branch
                </div>
                {branches.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => {
                      setActiveBranch(b);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      activeBranch?._id === b._id
                        ? 'bg-primary text-white font-bold'
                        : 'text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    {activeBranch?._id === b._id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
