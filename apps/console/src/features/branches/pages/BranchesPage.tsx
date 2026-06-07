import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Drawer, Badge, Table, RoomStatus } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Plus } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../lib/api';

interface Branch {
  _id: string;
  name: string;
  code: string;
  address: string;
  isActive: boolean;
}

export default function BranchesPage() {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', isActive: true });

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setBranches(await api.get<Branch[]>('/branches')); }
    catch { toast('error', 'Failed to load branches.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEdit(null); setForm({ name: '', code: '', address: '', isActive: true }); setDrawer(true); };
  const openEdit = (b: Branch) => { setEdit(b); setForm({ name: b.name, code: b.code, address: b.address, isActive: b.isActive }); setDrawer(true); };

  const save = async () => {
    setSaving(true);
    try {
      if (edit) await api.patch(`/branches/${edit._id}`, form);
      else await api.post('/branches', form);
      toast('success', edit ? 'Branch updated.' : 'Branch created.');
      setDrawer(false);
      fetch();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const columns: TableProps<Branch>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Code', dataIndex: 'code', key: 'code', width: 80, render: (_: unknown, r: Branch) => <span className="font-mono">{r.code}</span> },
    { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: 'Status', dataIndex: 'isActive', key: 'status', width: 100, render: (_: unknown, r: Branch) => <Badge status={r.isActive ? RoomStatus.Available : RoomStatus.Maintenance} /> },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Administration</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Branches</h1>
        <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>New Branch</Button>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div> :
          <Table<Branch> columns={columns} dataSource={branches} rowKey="_id" pagination={false} onRow={(r) => ({ onClick: () => openEdit(r), style: { cursor: 'pointer' } })} />}
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title={edit ? 'Edit Branch' : 'New Branch'} size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setDrawer(false)}>Cancel</Button><Button loading={saving} onClick={save}>{edit ? 'Save' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input size="lg" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input size="lg" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <Input size="lg" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </Drawer>
    </div>
  );
}
