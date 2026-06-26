import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select, Option, Drawer, Table, Badge, RoomStatus, UserRole } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus, Search } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { api } from '../../../lib/api';
import { departmentsApi, type Department } from '../../departments/api/departments.api';

const LIMIT = 20;

interface Branch {
  _id: string;
  name: string;
  code: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  department?: string;
  position?: string;
  branchId: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedData {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
}

export default function EmployeePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditor = user ? user.role !== UserRole.FacilityManager : false;
  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', department: '', departmentId: '', position: '', branchId: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, br, depts] = await Promise.all([
        api.get<PaginatedData>(`/employees?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}&includeInactive=true`),
        api.get<{ items: Branch[] }>('/branches').then((r) => r.items),
        departmentsApi.list(user?.activeBranchId || ''),
      ]);
      setData(emps);
      setBranches(br);
      setDepartments(depts);
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
    setEdit(null);
    setForm({ name: '', email: '', phone: '', department: '', departmentId: '', position: '', branchId: branches[0]?._id || '' });
    setDrawer(true);
  };

  const openEdit = (e: Employee) => {
    setEdit(e);
    setForm({ name: e.name, email: e.email, phone: e.phone, department: e.department || '', departmentId: (e as any).departmentId?._id || '', position: e.position || '', branchId: e.branchId });
    setDrawer(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (edit) {
        await api.patch(`/employees/${edit._id}`, { ...form, departmentId: form.departmentId || undefined });
        toast('success', 'Employee updated.');
      } else {
        await api.post('/employees', { ...form, departmentId: form.departmentId || undefined });
        toast('success', 'Employee created.');
      }
      setDrawer(false);
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (e: Employee) => {
    try {
      await api.patch(`/employees/${e._id}`, { isActive: !e.isActive });
      toast('success', e.isActive ? 'Employee deactivated.' : 'Employee activated.');
      fetchAll();
    } catch (err: any) { toast('error', err.message); }
  };

  const branchMap = useCallback((id: string) => branches.find((b) => b._id === id), [branches]);

  const columns: TableProps<Employee>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140 },
    { title: 'Department', dataIndex: 'departmentId', key: 'department', width: 130,
      render: (_: unknown, r: Employee) => (
        <span className="text-xs">{(r as any).departmentId?.name || r.department || '—'}</span>
      )},
    { title: 'Position', dataIndex: 'position', key: 'position', width: 150 },
    { title: 'Branch', key: 'branch', width: 120,
      render: (_: unknown, r: Employee) => (
        <span className="text-xs">{branchMap(r.branchId)?.name || '—'}</span>
      )},
    { title: 'Status', key: 'status', width: 100,
      render: (_: unknown, r: Employee) => <Badge status={r.isActive ? RoomStatus.Available : RoomStatus.Maintenance} /> },
    { title: 'Actions', key: 'action', width: 220,
      render: (_: unknown, r: Employee) => (
        <div className="flex gap-2">
          {isEditor && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Edit</Button>
          )}
          {isEditor && (
            <Button size="sm" variant={r.isActive ? 'destructive' : 'default'} onClick={(e) => { e.stopPropagation(); toggleActive(r); }}>
              {r.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      )},
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Personnel</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Employees</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search employees..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          {isEditor && <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Add Employee</Button>}
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<Employee>
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

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={edit ? 'Edit Employee' : 'Add Employee'} size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button>
            <Button loading={saving} onClick={save}>{edit ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input size="lg" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input size="lg" type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!edit} />
          <Input size="lg" placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select size="lg" className="w-full" value={form.departmentId} onChange={(v) => setForm({ ...form, departmentId: v })} placeholder="Select department">
              {departments.map((d) => <Option key={d._id} value={d._id}>{d.name}</Option>)}
            </Select>
            <Input size="lg" placeholder="Position (e.g. Head Housekeeper)" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline block mb-1">Branch</label>
            <Select size="lg" className="w-full" value={form.branchId} onChange={(v) => setForm({ ...form, branchId: v })}>
              {branches.map((b) => <Option key={b._id} value={b._id}>{b.name}</Option>)}
            </Select>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
