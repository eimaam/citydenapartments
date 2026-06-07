import { useState, useEffect, useRef } from 'react';
import { Menu, ChevronRight, MapPin, ChevronDown, Check } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/auth';
import { useToast } from '../../components/ui/Toast';
import { api } from '../../lib/api';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/rooms': 'Rooms',
  '/bookings': 'Bookings',
  '/breakfast': 'Breakfast',
};

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchOpen, setBranchOpen] = useState(false);
  const branchRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, switchBranch } = useAuth();
  const { toast } = useToast();

  const currentTitle = pageTitles[location.pathname] ?? '';

  useEffect(() => {
    api.get<Branch[]>('/branches').then(setBranches).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activeBranch = branches.find((b) => b._id === user?.activeBranchId);
  const allowedBranchIds = user?.allowedBranches ?? [];
  const userBranches = branches.filter((b) => allowedBranchIds.includes(b._id));
  const canSwitch = userBranches.length > 1;

  const handleSwitch = async (branchId: string) => {
    setBranchOpen(false);
    const target = userBranches.find((b) => b._id === branchId);
    try {
      await switchBranch(branchId);
      toast('success', `Switched to ${target?.name ?? 'branch'}.`);
    } catch {
      toast('error', 'Failed to switch branch.');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="h-14 flex items-center gap-3 px-4 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded text-on-surface-variant hover:bg-surface-container cursor-pointer"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <ChevronRight size={14} className="text-outline flex-shrink-0" />
            <span className="text-xs font-bold tracking-[0.1em] uppercase text-outline truncate">
              {currentTitle}
            </span>
          </div>

          {/* Branch indicator */}
          <div className="ml-auto flex-shrink-0" ref={branchRef}>
            {activeBranch && (
              <div className="relative">
                <button
                  onClick={() => canSwitch && setBranchOpen(!branchOpen)}
                  className={`flex items-center gap-2 h-8 px-3 rounded-full border text-xs font-medium transition-all ${canSwitch ? 'cursor-pointer hover:border-primary' : 'cursor-default'} border-outline-variant bg-surface-container-low text-outline`}
                >
                  <MapPin size={12} className="text-primary flex-shrink-0" />
                  <span className="hidden sm:inline font-semibold text-on-surface-variant">
                    {activeBranch.name}
                  </span>
                  <span className="text-[10px] font-mono text-outline">
                    {activeBranch.code}
                  </span>
                  {canSwitch && <ChevronDown size={12} className={`transition-transform ${branchOpen ? 'rotate-180' : ''}`} />}
                </button>

                {canSwitch && branchOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-ambient z-50 py-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">
                      Switch Branch
                    </div>
                    {userBranches.map((b) => (
                      <button
                        key={b._id}
                        onClick={() => handleSwitch(b._id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="flex-1 text-left">{b.name}</span>
                        <span className="text-[10px] font-mono text-outline">{b.code}</span>
                        {b._id === activeBranch._id && (
                          <Check size={14} className="text-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
