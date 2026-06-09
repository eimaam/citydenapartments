import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select, Option, Drawer, Badge, Table, UserRole, RoomStatus, CustomMultiSelect, type UserRoleType } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus, Copy, Check, Search } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../lib/api';

const LIMIT = 20;

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || 'https://staff.citydenapartments.com';

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface StaffUser {
  _id: string;
  email: string;
  name: string;
  role: UserRoleType;
  allowedBranches: string[];
  isActive: boolean;
}

interface CreatedAccount {
  email: string;
  password: string;
  name: string;
  loginUrl: string;
}

interface PaginatedData {
  items: StaffUser[];
  total: number;
  page: number;
  limit: number;
}

export default function StaffPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', name: '', role: UserRole.Reception as string, branchIds: [] as string[] });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([
        api.get<PaginatedData>(`/users?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`),
        api.get<Branch[]>('/branches'),
      ]);
      setData({ items: u.items, total: u.total, page: u.page, limit: u.limit });
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

  const branchOptions = branches.map((b) => ({ label: `${b.name} (${b.code})`, value: b._id }));

  const openCreate = () => {
    setEdit(null);
    setCreatedAccount(null);
    setForm({ email: '', name: '', role: UserRole.Reception, branchIds: [] });
    setDrawer(true);
  };

  const openEdit = (u: StaffUser) => {
    setEdit(u);
    setCreatedAccount(null);
    setForm({ email: u.email, name: u.name, role: u.role, branchIds: u.allowedBranches ?? [] });
    setDrawer(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/users/${edit._id}`, { name: form.name, role: form.role, allowedBranches: form.branchIds });
        toast('success', 'Staff updated.');
        setDrawer(false);
        fetchAll();
      } else {
        const res = await api.post<{ user: StaffUser; generatedPassword: string }>('/users', {
          email: form.email,
          name: form.name,
          role: form.role,
          allowedBranches: form.branchIds,
        });
        setCreatedAccount({
          email: form.email,
          password: res.generatedPassword,
          name: form.name,
          loginUrl: `${PLATFORM_URL}/login`,
        });
        toast('success', 'Account created.');
        fetchAll();
      }
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u: StaffUser) => {
    try {
      await api.patch(`/users/${u._id}`, { isActive: !u.isActive });
      toast('success', u.isActive ? 'User deactivated.' : 'User activated.');
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
  };

  const resetPassword = async (u: StaffUser) => {
    try {
      const res = await api.post<{ user: StaffUser; generatedPassword: string }>(`/users/${u._id}/reset-password`);
      setCreatedAccount({
        email: u.email,
        password: res.generatedPassword,
        name: u.name,
        loginUrl: `${PLATFORM_URL}/login`,
      });
      setEdit(u);
      setDrawer(true);
      toast('success', 'Password reset. Share new credentials.');
    } catch (e: any) { toast('error', e.message); }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = async () => {
    if (!createdAccount) return;
    const msg = `Hi ${createdAccount.name},\n\nYour City Den staff account is ready:\n\n🔗 ${createdAccount.loginUrl}\n📧 ${createdAccount.email}\n🔑 ${createdAccount.password}\n\nPlease change your password after logging in.`;
    await navigator.clipboard.writeText(msg);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
    toast('success', 'Account details copied. Paste in WhatsApp or any messenger.');
  };

  const columns: TableProps<StaffUser>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role', width: 160 },
    { title: 'Branches', key: 'branches', width: 120,
      render: (_: unknown, r: StaffUser) => (
        <span className="text-xs">{r.allowedBranches?.length ?? 0} branch{(r.allowedBranches?.length ?? 0) !== 1 ? 'es' : ''}</span>
      )},
    { title: 'Status', key: 'status', width: 120,
      render: (_: unknown, r: StaffUser) => <Badge status={r.isActive ? RoomStatus.Available : RoomStatus.Maintenance} /> },
    { title: 'Actions', key: 'action', width: 240,
      render: (_: unknown, r: StaffUser) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); resetPassword(r); }}>Reset Pwd</Button>
          <Button size="sm" variant={r.isActive ? 'destructive' : 'default'} onClick={(e) => { e.stopPropagation(); toggleActive(r); }}>
            {r.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      )},
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Staff</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search staff..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Add Staff</Button>
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<StaffUser>
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
        />
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={edit ? 'Edit Staff' : 'Add Staff'} size="sm"
        footer={!createdAccount ? (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button>
            <Button loading={saving} onClick={save}>{edit ? 'Save' : 'Create Account'}</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setCreatedAccount(null); setDrawer(false); }}>Close</Button>
          </div>
        )}>
        {createdAccount ? (
          /* ── Account created display ── */
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Check size={18} className="text-emerald-600" />
                <span className="font-semibold text-emerald-700">Account Created</span>
              </div>
              <p className="text-xs text-emerald-600 mb-3">Share these credentials with {createdAccount.name}.</p>

              {[
                { label: 'Login URL', value: createdAccount.loginUrl, key: 'url' },
                { label: 'Email', value: createdAccount.email, key: 'email' },
                { label: 'Password', value: createdAccount.password, key: 'pwd' },
              ].map(({ label, value, key }) => (
                <div key={key} className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase text-outline w-16">{label}</span>
                  <code className="flex-1 px-2 py-1 text-xs bg-white rounded border border-outline-variant font-mono truncate">{value}</code>
                  <button onClick={() => copyToClipboard(value, key)}
                    className="p-1.5 rounded hover:bg-surface-container cursor-pointer bg-transparent border-none text-outline hover:text-primary">
                    {copiedField === key ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>

            <Button fullWidth onClick={copyAll} variant={copiedField === 'all' ? 'secondary' : 'default'}>
              {copiedField === 'all' ? <><Check size={14} /> Copied</> : <div className="flex items-center justify-center gap-2"><Copy size={14} /> Copy Info + Message </div>}
            </Button>
          </div>
        ) : (
          /* ── Create / Edit form ── */
          <div className="space-y-4">
            <Input size="lg" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input size="lg" type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!edit} />

            <Select size="lg" className="w-full" value={form.role} onChange={(v) => setForm({ ...form, role: v })}>
              {Object.values(UserRole).map((r) => <Option key={r} value={r}>{r}</Option>)}
            </Select>

            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Assigned Branches</label>
              <CustomMultiSelect
                options={branchOptions}
                value={form.branchIds}
                onChange={(v) => setForm({ ...form, branchIds: v })}
                placeholder="Select branches..."
                className="mt-1"
              />
            </div>

            {!edit && (
              <p className="text-xs text-outline">A random password will be generated and shown after creation.</p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
