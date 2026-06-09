import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  DoorOpen,
  Coffee,
  LogOut,
  X,
  ChevronLeft,
} from 'lucide-react';
import type { UserRoleType } from '../../lib/types';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/auth';

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  path: string;
}

const menuConfig: Record<UserRoleType, SidebarItem[]> = {
  SuperAdmin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  ],
  Reception: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Bookings', icon: CalendarCheck, path: '/bookings' },
    { label: 'Rooms', icon: DoorOpen, path: '/rooms' },
  ],
  KitchenStaff: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Breakfast', icon: Coffee, path: '/breakfast' },
  ],
  SocialMediaManager: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  ],
  HouseKeeper: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Rooms', icon: DoorOpen, path: '/rooms' },
  ],
};

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const items = user ? menuConfig[user.role] ?? [] : [];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--color-inverse-surface)] text-[var(--color-inverse-on-surface)]">
      {/* Brand */}
      <div className={cn(
        'flex items-center border-b border-white/[0.08]',
        collapsed ? 'justify-center h-16 px-0' : 'justify-between h-16 px-5',
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-[var(--radius)] bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
            <Building2 className="w-[18px] h-[18px] text-[var(--color-on-primary)]" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-[0.15em] uppercase whitespace-nowrap">
              City Den
            </span>
          )}
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 rounded text-white/60 hover:text-white cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className={cn('px-3 space-y-0.5', collapsed && 'px-2')}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius)] transition-all duration-200 cursor-pointer',
                  collapsed ? 'justify-center px-0 h-10 w-10 mx-auto' : 'px-3 h-10',
                  isActive
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* User & Logout */}
      <div className={cn(
        'border-t border-white/[0.08]',
        collapsed ? 'p-2' : 'p-3',
      )}>
        <div className={cn(
          'flex items-center gap-3 rounded-[var(--radius)]',
          collapsed ? 'justify-center' : 'px-3 py-2',
        )}>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-[var(--color-primary)]">
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 w-full rounded-[var(--radius)] transition-all duration-200 text-white/50 hover:text-white/80 hover:bg-white/[0.06] cursor-pointer',
            collapsed ? 'justify-center h-10' : 'px-3 h-9',
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-xs">Sign out</span>}
        </button>
      </div>

      {/* collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex items-center justify-center h-10 border-t border-white/[0.08] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
      >
        <ChevronLeft size={16} className={cn('transition-transform duration-300', collapsed && 'rotate-180')} />
      </button>
    </div>
  );

  return (
    <>
      {/* mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-[280px] shadow-2xl transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarContent}
        </div>
      </div>

      {/* Desktop */}
      <aside
        className={cn(
          'hidden lg:block h-screen sticky top-0 flex-shrink-0 transition-all duration-300 ease-out',
          collapsed ? 'w-16' : 'w-[260px]',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
