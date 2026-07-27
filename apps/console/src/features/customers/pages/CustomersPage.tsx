import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select, Option, Drawer, Table, Badge, RoomStatus, UserRole, Gender } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';

const LIMIT = 20;

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface LifetimeDiscount {
  branchId: string;
  percentage: number;
  updatedBy?: string;
  updatedAt?: string;
  reason?: string;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  nationality: string;
  dob?: string;
  phone2?: string;
  comingFrom: string;
  stateOfOrigin: string;
  occupation: string;
  nextDestination: string;
  gender: string;
  religion?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: string;
  firstBranchId?: string;
  branchLifetimeDiscounts?: LifetimeDiscount[];
  createdAt: string;
}

interface PaginatedData {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
}

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const role = (user as any)?.role;
  const isAdmin = role === UserRole.SuperAdmin || role === UserRole.GroupGM;
  const allowedBranches: string[] = (user as any)?.allowedBranches ?? [];

  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [drawer, setDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', nationality: '',
    dob: '', phone2: '', comingFrom: '', stateOfOrigin: '',
    occupation: '', nextDestination: '', gender: Gender.Male, religion: '',
  });

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  const [discountForm, setDiscountForm] = useState<{
    mode: 'add' | 'edit';
    branchId: string;
    percentage: number;
    reason: string;
  } | null>(null);
  const [savingDiscount, setSavingDiscount] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([
        api.get<PaginatedData>(`/customers?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`),
        api.get<{ items: Branch[] }>('/branches').then((r) => r.items),
      ]);
      setData({ items: c.items, total: c.total, page: c.page, limit: c.limit });
      setBranches(b);
    } catch { toast('error', 'Failed to load data.'); }
    finally { setLoading(false); }
  }, [toast, page, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const openCreate = () => {
    setForm({
      name: '', phone: '', email: '', address: '', nationality: '',
      dob: '', phone2: '', comingFrom: '', stateOfOrigin: '',
      occupation: '', nextDestination: '', gender: Gender.Male, religion: '',
    });
    setDrawer(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/customers', {
        ...form,
        dob: form.dob || undefined,
        phone2: form.phone2 || undefined,
        email: form.email || undefined,
        religion: form.religion || undefined,
        firstBranchId: (user as any)?.activeBranchId,
      });
      toast('success', 'Customer created.');
      setDrawer(false);
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const branchName = useCallback((id: string) => branches.find((b) => b._id === id)?.name || id, [branches]);

  const openDiscountForm = (mode: 'add' | 'edit', existing?: LifetimeDiscount) => {
    setDiscountForm({
      mode,
      branchId: existing?.branchId || '',
      percentage: existing?.percentage || 0,
      reason: existing?.reason || '',
    });
  };

  const saveDiscount = async () => {
    if (!discountForm || !detailCustomer) return;
    setSavingDiscount(true);
    try {
      await api.patch(`/customers/${detailCustomer._id}/branch-discounts`, {
        branchId: discountForm.branchId,
        percentage: discountForm.percentage,
        reason: discountForm.reason || undefined,
      });
      toast('success', discountForm.percentage > 0 ? 'Lifetime discount set.' : 'Lifetime discount removed.');
      setDiscountForm(null);
      const updated = await api.get<Customer>(`/customers/${detailCustomer._id}`);
      setDetailCustomer(updated);
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
    finally { setSavingDiscount(false); }
  };

  const removeDiscount = async (branchId: string) => {
    if (!detailCustomer) return;
    setSavingDiscount(true);
    try {
      await api.patch(`/customers/${detailCustomer._id}/branch-discounts`, { branchId, percentage: 0 });
      toast('success', 'Lifetime discount removed.');
      const updated = await api.get<Customer>(`/customers/${detailCustomer._id}`);
      setDetailCustomer(updated);
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
    finally { setSavingDiscount(false); }
  };

  const columns: TableProps<Customer>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Visits', dataIndex: 'totalVisits', key: 'visits', width: 80 },
    { title: 'Total Spent', key: 'spent', width: 120,
      render: (_: unknown, r: Customer) => `₦${(r.totalSpent ?? 0).toLocaleString()}`,
    },
    { title: 'Discount', key: 'discount', width: 80,
      render: (_: unknown, r: Customer) =>
        (r.branchLifetimeDiscounts?.length ?? 0) > 0
          ? <Badge status={RoomStatus.Available} />
          : null,
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">People</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Customers</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search customers..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          {isAdmin && <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Add Customer</Button>}
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<Customer>
          columns={columns}
          dataSource={data.items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: data.page,
            pageSize: data.limit,
            total: data.total,
            showSizeChanger: true,
            onChange: (p) => setPage(p),
          }}
          onRow={(record) => ({
            onClick: () => setDetailCustomer(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <Drawer open={!!detailCustomer} onClose={() => { setDetailCustomer(null); setDiscountForm(null); }}
        title="Customer Details" size="sm"
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => { setDetailCustomer(null); setDiscountForm(null); }}>Close</Button></div>}>
        {detailCustomer && (
          <div className="space-y-6">
            <div className="space-y-4">
              <Field label="Name" value={detailCustomer.name} />
              <Field label="Phone" value={detailCustomer.phone} />
              {detailCustomer.email && <Field label="Email" value={detailCustomer.email} />}
              <Field label="Gender" value={detailCustomer.gender} />
              <Field label="Nationality" value={detailCustomer.nationality} />
              <Field label="Address" value={detailCustomer.address} />
              <Field label="State of Origin" value={detailCustomer.stateOfOrigin} />
              <Field label="Occupation" value={detailCustomer.occupation} />
              <Field label="Coming From" value={detailCustomer.comingFrom} />
              <Field label="Next Destination" value={detailCustomer.nextDestination} />
              {detailCustomer.dob && <Field label="DOB" value={new Date(detailCustomer.dob).toLocaleDateString()} />}
              {detailCustomer.phone2 && <Field label="Phone 2" value={detailCustomer.phone2} />}
              {detailCustomer.religion && <Field label="Religion" value={detailCustomer.religion} />}
            </div>

            <div className="border-t border-outline-variant pt-4">
              <Field label="Total Visits" value={String(detailCustomer.totalVisits ?? 0)} />
              <Field label="Total Spent" value={`₦${(detailCustomer.totalSpent ?? 0).toLocaleString()}`} />
              {detailCustomer.lastVisitDate && <Field label="Last Visit" value={new Date(detailCustomer.lastVisitDate).toLocaleDateString()} />}
            </div>

            <div className="border-t border-outline-variant pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Lifetime Discounts</label>
                {isAdmin && !discountForm && (
                  <Button size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => openDiscountForm('add')}>Add</Button>
                )}
              </div>

              {discountForm && (
                <div className="mb-3 p-3 rounded border border-outline-variant space-y-2">
                  <Select size="sm" className="w-full" value={discountForm.branchId}
                    onChange={(v) => setDiscountForm({ ...discountForm, branchId: v })}
                    placeholder="Select branch">
                    {branches
                      .filter((b) => {
                        if (discountForm.mode === 'edit') return b._id === discountForm.branchId;
                        return allowedBranches.includes(b._id)
                          && !detailCustomer.branchLifetimeDiscounts?.some((d) => d.branchId === b._id);
                      })
                      .map((b) => <Option key={b._id} value={b._id}>{b.name} ({b.code})</Option>)}
                  </Select>
                  <Input size="sm" type="number" min={0} max={100} placeholder="Discount %"
                    value={String(discountForm.percentage)}
                    onChange={(e) => setDiscountForm({ ...discountForm, percentage: Number(e.target.value) })} />
                  <Input size="sm" placeholder="Reason (optional)"
                    value={discountForm.reason}
                    onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" loading={savingDiscount} onClick={saveDiscount}>Save</Button>
                    <Button size="sm" variant="secondary" onClick={() => setDiscountForm(null)}>Cancel</Button>
                  </div>
                </div>
              )}

              {(!detailCustomer.branchLifetimeDiscounts || detailCustomer.branchLifetimeDiscounts.length === 0) && !discountForm && (
                <p className="text-xs text-outline">No lifetime discounts set.</p>
              )}

              {detailCustomer.branchLifetimeDiscounts?.map((d) => (
                <div key={d.branchId} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-b-0">
                  <div>
                    <span className="text-sm font-medium text-on-surface">{branchName(d.branchId)}</span>
                    <span className="ml-2 text-sm text-primary font-semibold">{d.percentage}%</span>
                    {d.reason && <p className="text-xs text-outline">{d.reason}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openDiscountForm('edit', d)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeDiscount(d.branchId)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Add Customer" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button>
            <Button loading={saving} onClick={save}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input size="lg" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input size="lg" placeholder="Phone (e.g. 08012345678)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input size="lg" type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select size="lg" className="w-full" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })}>
              <Option value={Gender.Male}>Male</Option>
              <Option value={Gender.Female}>Female</Option>
            </Select>
            <Input size="lg" placeholder="Nationality" value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </div>
          <Input size="lg" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input size="lg" placeholder="State of Origin" value={form.stateOfOrigin} onChange={(e) => setForm({ ...form, stateOfOrigin: e.target.value })} />
            <Input size="lg" placeholder="Coming From" value={form.comingFrom} onChange={(e) => setForm({ ...form, comingFrom: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input size="lg" placeholder="Occupation" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
            <Input size="lg" placeholder="Next Destination" value={form.nextDestination} onChange={(e) => setForm({ ...form, nextDestination: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input size="lg" type="date" placeholder="DOB (optional)" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            <Input size="lg" placeholder="Phone 2 (optional)" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
          </div>
          <Input size="lg" placeholder="Religion (optional)" value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} />
        </div>
      </Drawer>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline">{label}</label>
      <p className="mt-0.5 text-sm text-on-surface">{value}</p>
    </div>
  );
}
