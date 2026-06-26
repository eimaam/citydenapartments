import { Shield, Building2, CalendarCheck, DoorOpen, Coffee, Package, Users, Eye, Monitor, BadgeDollarSign, ClipboardList, Building, Percent } from 'lucide-react';

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
      { name: 'Departments', description: 'Create and manage departments' },
      { name: 'Room Types', description: 'Set room categories, prices, and minimum rates' },
      { name: 'Rooms', description: 'Add, edit, or remove rooms across all branches' },
      { name: 'Bookings', description: 'View and manage every booking in the system' },
      { name: 'Breakfast', description: 'View breakfast logs across all branches' },
      { name: 'Employees', description: 'Create, edit, or deactivate employee records' },
      { name: 'Staff', description: 'Create, edit, or deactivate any user account' },
      { name: 'Inventory', description: 'Full inventory management' },
      { name: 'Discount Codes', description: 'Generate and manage promo codes (up to 50%)' },
      { name: 'Roles', description: 'View role documentation' },
    ],
    can: [
      'Create and manage hotel branches',
      'Manage departments in any branch',
      'Set room types, prices, and minimum rate limits',
      'Add, edit, or remove rooms in any branch',
      'Create, edit, or deactivate any staff account (including managers)',
      'Create, cancel, check in, and check out any booking',
      'Full inventory management — create, restock, issue, adjust, report spoilage',
      'Generate discount codes up to 50%',
      'View reports and analytics across all branches',
      'Reset any user\'s password',
    ],
    cannot: [
      'Nothing — you have full system access',
    ],
  },
  {
    role: 'Group GM',
    icon: Eye,
    color: '#8b5cf6',
    summary: 'Oversight across all branches with limited write access.',
    pages: [
      { name: 'Dashboard', description: 'See stats for all branches at once' },
      { name: 'Departments', description: 'View and manage departments' },
      { name: 'Room Types', description: 'View room categories, prices, and minimum rates' },
      { name: 'Rooms', description: 'View all rooms across all branches' },
      { name: 'Bookings', description: 'Create bookings and cancel reservations' },
      { name: 'Breakfast', description: 'View breakfast logs across all branches' },
      { name: 'Employees', description: 'View employee records' },
      { name: 'Inventory', description: 'View-only — cannot add, restock, issue, or write off' },
      { name: 'Discount Codes', description: 'Generate promo codes (up to 50%)' },
      { name: 'Roles', description: 'View role documentation' },
    ],
    can: [
      'View reports and analytics across all branches',
      'Create bookings at any branch',
      'Cancel reservations',
      'Manage departments (create, edit, soft-delete)',
      'Generate discount codes up to 50%',
      'View employees across all branches',
      'View inventory items, stock levels, and transaction history',
    ],
    cannot: [
      'Create or manage branches',
      'Create or delete user accounts',
      'Add, restock, issue, or write off inventory items',
      'Edit room types or pricing',
      'Check guests in or out',
    ],
  },
  {
    role: 'Facility Manager',
    icon: Building2,
    color: '#3b82f6',
    summary: 'Runs daily operations of their assigned branch.',
    pages: [
      { name: 'Dashboard', description: 'See real-time stats for their branch only' },
      { name: 'Departments', description: 'View departments in their branch' },
      { name: 'Bookings', description: 'Create bookings, check guests in and out, cancel reservations' },
      { name: 'Rooms', description: 'View rooms and update their status' },
      { name: 'Breakfast', description: 'View breakfast manifest and mark meals as served' },
      { name: 'Discount Codes', description: 'Generate promo codes (up to 15%)' },
    ],
    can: [
      'Create, check in, check out, and cancel bookings in their branch',
      'Update room statuses (e.g., mark a room as dirty or available)',
      'View breakfast manifest and mark meals as served',
      'Generate discount codes up to 15%',
      'View departments in their branch',
      'View reports and analytics for their branch only',
    ],
    cannot: [
      'Create or manage other branches',
      'Create or edit room types or pricing',
      'Access inventory — no item views, no stock operations',
      'View or manage employee records',
      'Create, edit, or deactivate any staff accounts',
      'Add or remove rooms',
      'See data from other branches',
    ],
  },
  {
    role: 'Front Office Manager',
    icon: ClipboardList,
    color: '#f59e0b',
    summary: 'Manages front desk operations, bookings, and room assignments.',
    pages: [
      { name: 'Dashboard', description: 'See today\'s arrivals, occupancy, and breakfast counts' },
      { name: 'Bookings', description: 'Create, check in, and check out bookings' },
      { name: 'Rooms', description: 'View room statuses and update them' },
      { name: 'Discount Codes', description: 'Generate promo codes (up to 10%)' },
    ],
    can: [
      'Create walk-in and phone bookings',
      'Check guests in and out of their rooms',
      'Update room statuses',
      'Generate discount codes up to 10%',
      'See today\'s arrivals and current occupancy',
    ],
    cannot: [
      'Cancel reservations (only Super Admin, Group GM, Facility Manager, IT can cancel)',
      'Create or manage staff accounts',
      'Change room types or pricing',
      'Access other branches or system settings',
      'Manage inventory',
    ],
  },
  {
    role: 'Accountant',
    icon: BadgeDollarSign,
    color: '#06b6d4',
    summary: 'Handles financial records, inventory valuation, and spoilage reporting.',
    pages: [
      { name: 'Dashboard', description: 'See branch stats and financial summaries' },
      { name: 'Bookings', description: 'View booking records and payments (read-only)' },
      { name: 'Rooms', description: 'View room statuses' },
      { name: 'Inventory', description: 'View inventory items, stock, and transactions' },
      { name: 'Transactions', description: 'View stock movement history' },
    ],
    can: [
      'View all booking records and payment data (read-only)',
      'View room statuses',
      'View inventory items and stock levels',
      'Report spoilage for inventory items',
      'View transaction history',
      'View daily stock snapshots',
    ],
    cannot: [
      'Create, check in, check out, or cancel bookings',
      'Issue items to staff or departments',
      'Restock or edit inventory items',
      'Create or manage staff accounts',
      'Manage branches or room types',
    ],
  },
  {
    role: 'Store Manager',
    icon: Package,
    color: '#06b6d4',
    summary: 'Manages inventory items, stock levels, and store operations.',
    pages: [
      { name: 'Dashboard', description: 'See branch stats' },
      { name: 'Inventory', description: 'Add, edit, restock, and issue inventory items' },
      { name: 'Transactions', description: 'View stock movement history' },
    ],
    can: [
      'Create new inventory items with categories and units',
      'Add stock (restock) to any item',
      'Issue items to staff or departments',
      'Look up employees when issuing items',
      'Edit item details and reorder levels',
      'View transaction history for all items',
      'View daily stock snapshots',
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
      'Look up employees when issuing items',
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
      'Update room statuses (e.g., mark a room available after cleaning)',
      'Apply discount codes (cannot generate them)',
      'See today\'s arrivals and current occupancy',
    ],
    cannot: [
      'Cancel reservations (only Super Admin, Group GM, Facility Manager, IT can cancel)',
      'Generate discount codes',
      'Create or manage staff accounts',
      'Change room prices or pricing',
      'Access other branches or system settings',
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
    role: 'HouseKeeper',
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
      'Access inventory',
      'View financial data',
      'Access any staff management features',
    ],
  },
  {
    role: 'IT',
    icon: Monitor,
    color: '#6366f1',
    summary: 'Manages user accounts, departments, and system configuration.',
    pages: [
      { name: 'Dashboard', description: 'See system overview' },
      { name: 'Departments', description: 'Create and manage departments' },
      { name: 'Room Types', description: 'View, create, and edit room categories' },
      { name: 'Rooms', description: 'View, create, and edit rooms' },
      { name: 'Employees', description: 'View, create, edit, and deactivate employee records' },
      { name: 'Staff', description: 'Create and manage user accounts' },
      { name: 'Roles', description: 'View role documentation' },
    ],
    can: [
      'View, create, and edit room types',
      'View, create, and edit rooms',
      'View, create, edit, and deactivate employee records',
      'Create and manage user accounts (except Super Admin, Group GM, Facility Manager, and other IT)',
      'Reset passwords for non-restricted users',
      'Manage departments (create, edit, soft-delete)',
      'Deactivate user accounts',
    ],
    cannot: [
      'Create or edit Super Admin, Group GM, Facility Manager, or IT accounts',
      'Manage bookings, breakfast, or inventory',
      'Change pricing or financial data',
      'Generate or manage discount codes',
      'Manage branches',
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