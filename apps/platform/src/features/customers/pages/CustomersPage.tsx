import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Button, Input, Table, Drawer, Select, Option } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Search, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { customersApi } from '../api/customers.api';
import type { CustomerResponse } from '@citydenapartments/shared';

const LIMIT = 20;

interface PaginatedData {
  items: CustomerResponse[];
  total: number;
  page: number;
  limit: number;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detail, setDetail] = useState<CustomerResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nationality: 'Nigerian',
    comingFrom: '',
    stateOfOrigin: '',
    occupation: '',
    nextDestination: '',
    gender: 'male',
    religion: '',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.list({ page, limit: LIMIT, search: search || undefined });
      setData(res);
    } catch {
      toast('error', 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [toast, page, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current!);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const handleCreateCustomer = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim() || !createForm.address.trim()) {
      toast('error', 'Name, phone, and address are required.');
      return;
    }
    setSavingCreate(true);
    try {
      await customersApi.create({
        ...createForm,
        firstBranchId: user?.activeBranchId || undefined,
      });
      toast('success', 'Customer profile created successfully.');
      setShowCreate(false);
      setCreateForm({
        name: '', phone: '', email: '', address: '', nationality: 'Nigerian',
        comingFrom: '', stateOfOrigin: '', occupation: '', nextDestination: '',
        gender: 'male', religion: '',
      });
      fetchAll();
    } catch (e: any) {
      toast('error', e.message || 'Failed to create customer.');
    } finally {
      setSavingCreate(false);
    }
  };

  const columns: TableProps<CustomerResponse>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (_: unknown, r: CustomerResponse) => (
        <div>
          <p className="font-medium text-on-surface">{r.name}</p>
          <p className="text-xs text-outline">{r.phone}</p>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (v: unknown) => v ? <span className="text-xs">{v as string}</span> : <span className="text-xs text-outline">—</span>,
    },
    { title: 'Visits', dataIndex: 'totalVisits', key: 'visits', width: 80, align: 'center' as const },
    {
      title: 'Total Spent',
      dataIndex: 'totalSpent',
      key: 'spent',
      width: 130,
      align: 'right' as const,
      render: (v: unknown) => <span className="font-medium">₦{(v as number)?.toLocaleString()}</span>,
    },
    {
      title: 'Last Visit',
      dataIndex: 'lastVisitDate',
      key: 'lastVisit',
      width: 140,
      render: (v: unknown) => v ? format(new Date(v as string), 'd MMM yyyy') : <span className="text-outline">—</span>,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 100,
      render: (_: unknown, r: CustomerResponse) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>View</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Directory &amp; Profiles</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Customers</h1>
          <p className="text-xs text-outline mt-1">Search and create guest profiles for bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            size="sm"
            placeholder="Search name, phone, email..."
            prefix={<Search size={14} className="text-outline" />}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="!w-72"
          />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
            Add Customer
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<CustomerResponse>
          columns={columns}
          dataSource={data.items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: data.page,
            pageSize: data.limit,
            total: data.total,
            showSizeChanger: true,
            showTotal: (total: number) => `${total} customer${total !== 1 ? 's' : ''}`,
            onChange: (p) => setPage(p),
          }}
          onRow={(record) => ({ onClick: () => setDetail(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* ── Customer Details Drawer ── */}
      <Drawer open={!!detail} onClose={() => setDetail(null)} title="Customer Details" width={480}>
        {detail && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-outline">Guest Name</p>
              <p className="font-medium text-lg">{detail.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-outline">Phone</p><p className="font-medium">{detail.phone}</p></div>
              <div><p className="text-xs text-outline">Email</p><p className="font-medium">{detail.email || '—'}</p></div>
              <div><p className="text-xs text-outline">Gender</p><p className="font-medium capitalize">{detail.gender}</p></div>
              <div><p className="text-xs text-outline">Nationality</p><p className="font-medium">{detail.nationality}</p></div>
              <div><p className="text-xs text-outline">State of Origin</p><p className="font-medium">{detail.stateOfOrigin}</p></div>
              <div><p className="text-xs text-outline">Occupation</p><p className="font-medium">{detail.occupation}</p></div>
              {detail.dob && <div><p className="text-xs text-outline">DOB</p><p className="font-medium">{format(new Date(detail.dob), 'd MMM yyyy')}</p></div>}
              {detail.phone2 && <div><p className="text-xs text-outline">Phone 2</p><p className="font-medium">{detail.phone2}</p></div>}
            </div>

            <div className="border-t border-outline-variant/60 pt-4">
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-2">Visit History &amp; Stats</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-outline">Total Visits</p><p className="font-medium text-lg">{detail.totalVisits}</p></div>
                <div><p className="text-xs text-outline">Total Spent</p><p className="font-medium text-lg">₦{detail.totalSpent?.toLocaleString()}</p></div>
                <div><p className="text-xs text-outline">Last Visit</p><p className="font-medium text-lg">{detail.lastVisitDate ? format(new Date(detail.lastVisitDate), 'd MMM yyyy') : '—'}</p></div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Add Customer Drawer ── */}
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Add New Customer" width={480}
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button loading={savingCreate} onClick={handleCreateCustomer}>Create Profile</Button></div>}>
        <div className="space-y-4 text-xs">
          <div><label className="text-[10px] text-outline uppercase tracking-wide">Full Name *</label><Input size="lg" placeholder="John Doe" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></div>
          <div><label className="text-[10px] text-outline uppercase tracking-wide">Phone Number (11-digit) *</label><Input size="lg" placeholder="08012345678" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
          <div><label className="text-[10px] text-outline uppercase tracking-wide">Email</label><Input size="lg" type="email" placeholder="john@example.com" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></div>
          <div><label className="text-[10px] text-outline uppercase tracking-wide">Address *</label><Input size="lg" placeholder="123 Street Name" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Gender *</label><Select size="lg" className="w-full" value={createForm.gender} onChange={(v) => setCreateForm({ ...createForm, gender: v })}>
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
            </Select></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Nationality *</label><Input size="lg" value={createForm.nationality} onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">State of Origin *</label><Input size="lg" placeholder="e.g. Lagos" value={createForm.stateOfOrigin} onChange={(e) => setCreateForm({ ...createForm, stateOfOrigin: e.target.value })} /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Occupation *</label><Input size="lg" placeholder="e.g. Engineer" value={createForm.occupation} onChange={(e) => setCreateForm({ ...createForm, occupation: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Coming From *</label><Input size="lg" placeholder="e.g. Abuja" value={createForm.comingFrom} onChange={(e) => setCreateForm({ ...createForm, comingFrom: e.target.value })} /></div>
            <div><label className="text-[10px] text-outline uppercase tracking-wide">Next Destination *</label><Input size="lg" placeholder="e.g. Kaduna" value={createForm.nextDestination} onChange={(e) => setCreateForm({ ...createForm, nextDestination: e.target.value })} /></div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
