import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Drawer } from '@citydenapartments/shared';
import { Plus, Search } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { departmentsApi, type Department } from '../api/departments.api';

export default function DepartmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [edit, setEdit] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const branchId = user?.activeBranchId || '';

  const fetchAll = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await departmentsApi.list(branchId);
      setData(res);
    } catch { toast('error', 'Failed to load departments.'); }
    finally { setLoading(false); }
  }, [branchId, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openCreate = () => {
    setEdit(null);
    setForm({ name: '', description: '' });
    setShowDrawer(true);
  };

  const openEdit = (d: Department) => {
    setEdit(d);
    setForm({ name: d.name, description: d.description || '' });
    setShowDrawer(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast('error', 'Department name is required.'); return; }
    setSaving(true);
    try {
      if (edit) {
        await departmentsApi.update(edit._id, { name: form.name, description: form.description || undefined });
        toast('success', 'Department updated.');
      } else {
        await departmentsApi.create({ name: form.name, description: form.description || undefined, branchId });
        toast('success', 'Department created.');
      }
      setShowDrawer(false);
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Organization</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Departments</h1>
        <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Add Department</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-outline col-span-full">Loading...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-outline col-span-full">No departments yet.</p>
        ) : data.map((d) => (
          <div key={d._id} className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm text-on-surface truncate">{d.name}</p>
              {d.description && <p className="text-xs text-outline mt-0.5 truncate">{d.description}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => openEdit(d)}>Edit</Button>
            </div>
          </div>
        ))}
      </div>

      <Drawer open={showDrawer} onClose={() => setShowDrawer(false)} title={edit ? 'Edit Department' : 'Add Department'} size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowDrawer(false)}>Cancel</Button>
          <Button loading={saving} onClick={save}>{edit ? 'Save' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline block mb-1">Name *</label>
            <Input size="lg" placeholder="e.g. Housekeeping" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline block mb-1">Description (optional)</label>
            <Input size="lg" placeholder="e.g. Responsible for cleaning and maintenance" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
