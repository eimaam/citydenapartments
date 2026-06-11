import { Shield, Building2, CalendarCheck, DoorOpen, Coffee, Package, Users, Camera, Sparkles } from 'lucide-react';

interface RolePermission {
  role: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  summary: string;
  pages: { name: string; description: string }[];
  can: string[];
  cannot: string[];
}

const roles: RolePermission[] = [
  {
    role: 'Super Admin',
    icon: Shield,
    color: '#d4af37',
    summary: 'Full access to everything. Owns the entire system.',
    pages: [
      { name: 'Dashboard', description: 'See stats for all branches at once' },
      { name: 'Branches', description: 'Add, edit, or remove hotel locations' },
      { name: 'Room Types', description: 'Set room categories, prices, and minimum rates' },
      { name: 'Rooms', description: 'Add, edit, or remove rooms across all branches' },
      { name: 'Bookings', description: 'View and manage every booking in the system' },
      { name: 'Breakfast', description: 'View breakfast logs across all branches' },
      { name: 'Staff', description: 'Create, edit, or deactivate any user account' },
      { name: 'Inventory', description: 'View and manage store items, stock levels, and transactions' },
    ],
    can: [
      'Create and manage hotel branches',
      'Set room types, prices, and minimum rate limits',
      'Add, edit, or remove rooms in any branch',
      'Create, edit, or deactivate any staff account (including managers)',
      'View reports and analytics across all branches',
      'Override any booking or room status',
      'Reset any user\'s password',
    ],
    cannot: [
      'Nothing — you have full system access',
    ],
  },
  {
    role: 'Branch Manager',
    icon: Building2,
    color: '#3b82f6',
    summary: 'Runs the daily operations of their assigned branch.',
    pages: [
      { name: 'Dashboard', description: 'See real-time stats for their branch only' },
      { name: 'Bookings', description: 'Create bookings, check guests in and out, cancel reservations' },
      { name: 'Rooms', description: 'View rooms and update their status' },
      { name: 'Breakfast', description: 'View breakfast manifest and mark meals as served' },
      { name: 'Staff', description: 'Create and manage staff accounts for their branch' },
    ],
    can: [
      'Create, check in, check out, and cancel bookings',
      'Update room statuses (e.g., mark a room as dirty or available)',
      'View breakfast manifest and mark meals as served',
      'Create staff accounts for their branch (Reception, Kitchen, Housekeeping, Marketing)',
      'Edit staff names and reset passwords for their branch staff',
      'Deactivate staff in their branch',
      'View reports and analytics for their branch only',
    ],
    cannot: [
      'Create or manage other branches',
      'Create or edit room types or pricing',
      'Create or edit Super Admin or other Branch Manager accounts',
      'See data from other branches',
      'Add or remove rooms',
    ],
  },
  {
    role: 'Store Manager',
    icon: Package,
    color: '#06b6d4',
    summary: 'Manages inventory items, stock levels, and store operations.',
    pages: [
      { name: 'Dashboard', description: 'See branch stats' },
      { name: 'Inventory', description: 'Add, edit, and restock inventory items' },
      { name: 'Transactions', description: 'View stock movement history' },
    ],
    can: [
      'Create new inventory items with categories and units',
      'Add stock (restock) to any item',
      'Issue items to staff or departments',
      'Edit item details and reorder levels',
      'View transaction history for all items',
      'View daily stock snapshots and close the day manually',
    ],
    cannot: [
      'Create or manage staff accounts',
      'Access bookings, rooms, or guest data',
      'Create branches or room types',
      'View financial data outside inventory',
    ],
  },
  {
    role: 'Store Keeper',
    icon: Package,
    color: '#14b8a6',
    summary: 'Issues store items to staff and tracks daily stock movement.',
    pages: [
      { name: 'Dashboard', description: 'See branch stats' },
      { name: 'Inventory', description: 'View items and issue stock' },
      { name: 'Transactions', description: 'View stock movement history' },
    ],
    can: [
      'View all inventory items and current stock levels',
      'Issue items to staff or departments',
      'View transaction history',
      'See alerts when stock is low',
    ],
    cannot: [
      'Add or edit inventory items',
      'Restock items (only Store Manager can restock)',
      'Create or manage staff accounts',
      'Access bookings, rooms, or guest data',
    ],
  },
  {
    role: 'Reception',
    icon: CalendarCheck,
    color: '#10b981',
    summary: 'Handles guest check-ins, check-outs, and front desk operations.',
    pages: [
      { name: 'Dashboard', description: 'See today\'s arrivals, occupancy, and breakfast counts' },
      { name: 'Bookings', description: 'Create new bookings, check guests in and out' },
      { name: 'Rooms', description: 'View room statuses and update them' },
    ],
    can: [
      'Create walk-in and phone bookings',
      'Check guests in and out of their rooms',
      'Cancel reservations',
      'Update room statuses (e.g., mark a room available after cleaning)',
      'See today\'s arrivals and current occupancy',
    ],
    cannot: [
      'Create or manage staff accounts',
      'Change room prices or create discounts without manager approval',
      'Access other branches or system settings',
      'Create or edit room types',
    ],
  },
  {
    role: 'Kitchen Staff',
    icon: Coffee,
    color: '#f59e0b',
    summary: 'Manages breakfast service for checked-in guests.',
    pages: [
      { name: 'Dashboard', description: 'See how many guests need breakfast today' },
      { name: 'Breakfast', description: 'View the breakfast manifest and mark meals as served' },
    ],
    can: [
      'View the daily breakfast manifest (which guests are eligible)',
      'Mark breakfast as served for each guest',
      'See how many breakfasts are pending vs completed',
    ],
    cannot: [
      'Create or manage bookings',
      'Change room statuses',
      'View financial data or reports',
      'Access any staff management features',
    ],
  },
  {
    role: 'House Keeper',
    icon: DoorOpen,
    color: '#8b5cf6',
    summary: 'Manages room cleaning and readiness.',
    pages: [
      { name: 'Dashboard', description: 'See room status overview' },
      { name: 'Rooms', description: 'View all rooms and update their cleaning status' },
    ],
    can: [
      'View all rooms and their current status',
      'Change room status after cleaning (Dirty → Available)',
      'Mark a room as needing maintenance',
      'See which rooms are occupied, dirty, or available',
    ],
    cannot: [
      'Create or manage bookings',
      'Check guests in or out',
      'View financial data',
      'Access any staff management features',
    ],
  },
  {
    role: 'Social Media Manager',
    icon: Camera,
    color: '#ec4899',
    summary: 'Monitors branch performance for content and marketing.',
    pages: [
      { name: 'Dashboard', description: 'View branch occupancy, revenue, and activity stats' },
    ],
    can: [
      'View branch performance metrics (occupancy, revenue, guest counts)',
      'See which room types are most popular',
      'Monitor daily activity for content ideas',
    ],
    cannot: [
      'Create or manage bookings',
      'Change room statuses',
      'Access guest personal information beyond what\'s on the dashboard',
      'Manage staff or system settings',
    ],
  },
];

export default function RolesPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Guide</span>
      </div>

      <div className="mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface mb-2">Roles & Permissions</h1>
        <p className="text-on-surface-variant text-sm max-w-2xl">
          Each staff account is assigned a role that determines what they can see and do.
          Below is a plain-English breakdown of every role and their access level.
        </p>
      </div>

      <div className="grid gap-6">
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.role}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-5 border-b border-outline-variant" style={{ background: `${r.color}08` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${r.color}18`, color: r.color }}>
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">{r.role}</h2>
                  <p className="text-sm text-on-surface-variant">{r.summary}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-outline-variant">
                {/* Pages */}
                <div className="p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-3">Pages They See</h3>
                  <ul className="space-y-2">
                    {r.pages.map((p) => (
                      <li key={p.name} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                        <div>
                          <span className="font-medium text-on-surface">{p.name}</span>
                          <p className="text-xs text-on-surface-variant">{p.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Can do */}
                <div className="p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-3">What They Can Do</h3>
                  <ul className="space-y-2">
                    {r.can.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 text-emerald-500 flex-shrink-0">✓</span>
                        <span className="text-on-surface">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cannot do */}
                <div className="p-5">
                  <h3 className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-3">What They Cannot Do</h3>
                  <ul className="space-y-2">
                    {r.cannot.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 text-red-400 flex-shrink-0">✗</span>
                        <span className="text-on-surface">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-8 p-4 rounded-lg border border-outline-variant bg-surface-container">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-on-surface mb-1">Need a different permission setup?</p>
            <p className="text-xs text-on-surface-variant">
              Roles are configured at the system level. If a staff member needs access
              that their role doesn't allow, contact the system administrator to discuss
              an upgrade or a custom setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}