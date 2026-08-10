import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shirt } from 'lucide-react';
import { Button, Input, Table, Modal, Badge } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type { LaundryItemResponse } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { laundryItemsApi, type LaundryCatalogCategory } from '../api/laundry-items.api';

interface ItemForm {
  category: string;
  item: string;
  laundryPrice: string;
  pressingPrice: string;
}

const emptyForm: ItemForm = { category: '', item: '', laundryPrice: '', pressingPrice: '' };

export default function LaundryItemsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canDelete = (user as any)?.role !== 'IT';

  const [catalog, setCatalog] = useState<LaundryCatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LaundryItemResponse | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [renameTarget, setRenameTarget] = useState<LaundryCatalogCategory | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<LaundryCatalogCategory | LaundryItemResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await laundryItemsApi.catalog();
      setCatalog(res);
      setActiveCategory((prev) => (prev && res.some((c) => c.name === prev) ? prev : res[0]?.name ?? ''));
    } catch {
      toast('error', 'Failed to load laundry price list.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: activeCategory });
    setModalOpen(true);
  };

  const openEdit = (item: LaundryItemResponse) => {
    setEditing(item);
    setForm({
      category: item.category,
      item: item.item,
      laundryPrice: String(item.laundryPrice),
      pressingPrice: item.pressingPrice !== null && item.pressingPrice !== undefined ? String(item.pressingPrice) : '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    const category = form.category.trim();
    const item = form.item.trim();
    const laundryPrice = Number(form.laundryPrice);
    const pressingPrice = form.pressingPrice.trim() === '' ? null : Number(form.pressingPrice);
    if (!category || !item || !Number.isFinite(laundryPrice) || laundryPrice < 0) {
      toast('error', 'Category, item name and a valid laundry price are required.');
      return;
    }
    if (pressingPrice !== null && (!Number.isFinite(pressingPrice) || pressingPrice < 0)) {
      toast('error', 'Pressing price must be a valid amount or left empty.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await laundryItemsApi.updateItem(editing._id, {
          category,
          item,
          laundryPrice,
          pressingPrice,
        });
        toast('success', 'Item updated.');
      } else {
        await laundryItemsApi.createItem({ category, item, laundryPrice, pressingPrice });
        toast('success', 'Item added.');
      }
      setModalOpen(false);
      fetchCatalog();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      if ('items' in deleteTarget) {
        await laundryItemsApi.deleteCategory(deleteTarget._id);
        toast('success', `Category "${deleteTarget.name}" deleted.`);
      } else {
        await laundryItemsApi.deleteItem(deleteTarget._id);
        toast('success', 'Item deleted.');
      }
      setDeleteTarget(null);
      fetchCatalog();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  };

  const doRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setBusy(true);
    try {
      await laundryItemsApi.renameCategory(renameTarget._id, renameValue.trim());
      toast('success', `Category renamed to "${renameValue.trim().toUpperCase()}".`);
      setRenameTarget(null);
      fetchCatalog();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Rename failed.');
    } finally {
      setBusy(false);
    }
  };

  const items = catalog.find((c) => c.name === activeCategory)?.items ?? [];

  const columns: TableProps<LaundryItemResponse>['columns'] = [
    { title: 'Item', dataIndex: 'item', key: 'item', render: (_: unknown, i: LaundryItemResponse) => <span className={i.isActive ? '' : 'opacity-40 line-through'}>{i.item}</span> },
    {
      title: 'Laundry', dataIndex: 'laundryPrice', key: 'laundry', width: 120, align: 'right' as const,
      render: (_: unknown, i: LaundryItemResponse) => <span className="font-medium">₦{i.laundryPrice.toLocaleString()}</span>,
    },
    {
      title: 'Pressing', dataIndex: 'pressingPrice', key: 'pressing', width: 120, align: 'right' as const,
      render: (_: unknown, i: LaundryItemResponse) => i.pressingPrice !== null && i.pressingPrice !== undefined ? <span>₦{i.pressingPrice.toLocaleString()}</span> : <span className="opacity-40">—</span>,
    },
    {
      title: 'Status', dataIndex: 'isActive', key: 'active', width: 100,
      render: (_: unknown, i: LaundryItemResponse) => i.isActive
        ? <Badge status="active" label="Active" colorMap={{ active: 'bg-emerald-50 text-emerald-700 border-emerald-200' }} />
        : <Badge status="disabled" label="Disabled" colorMap={{ disabled: 'bg-zinc-100 text-zinc-500 border-zinc-200' }} />,
    },
    {
      title: '', key: 'actions', width: 90,
      render: (_: unknown, i: LaundryItemResponse) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" icon={<Pencil size={13} />} onClick={() => openEdit(i)} />
          {canDelete && <Button size="sm" variant="outline" icon={<Trash2 size={13} />} onClick={() => setDeleteTarget(i)} />}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Laundry</span></div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Laundry Price List</h1>
          <p className="text-sm text-on-surface-variant">Manage the laundry &amp; pressing price list used at the front desk.</p>
        </div>
        <Button variant="default" icon={<Plus size={14} />} onClick={openCreate}>Add Item</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {catalog.map((c) => (
          <button
            key={c._id}
            onClick={() => setActiveCategory(c.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-colors cursor-pointer ${
              activeCategory === c.name
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant text-on-surface-variant hover:border-outline'
            }`}
          >
            {c.name} <span className="opacity-60">({c.items.length})</span>
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-xs text-outline">
          <Shirt size={13} /> {catalog.length} categor{catalog.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      <Table<LaundryItemResponse> columns={columns} dataSource={items} rowKey="_id" loading={loading} pagination={false} />

      <div className="flex flex-wrap gap-2 mt-4">
        {catalog.filter((c) => c.name === activeCategory).map((c) => (
          <span key={c._id} className="inline-flex items-center gap-1.5 text-xs">
            <Button size="sm" variant="outline" icon={<Pencil size={12} />} onClick={() => { setRenameTarget(c); setRenameValue(c.name); }}>
              Rename category
            </Button>
            {canDelete && (
              <Button size="sm" variant="outline" icon={<Trash2 size={12} />} onClick={() => setDeleteTarget(c)}>
                Delete category
              </Button>
            )}
          </span>
        ))}
      </div>

      {/* item form modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Item' : 'Add Item'} footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="default" loading={saving} onClick={save}>{editing ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      }>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-outline">Category *</label>
            <Input list="laundry-categories" placeholder="e.g. MEN'S WEAR" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <datalist id="laundry-categories">
              {catalog.map((c) => <option key={c._id} value={c.name} />)}
            </datalist>
            <p className="text-[10px] text-outline mt-1">Categories are stored uppercase and unique — "men's wear" becomes MEN'S WEAR.</p>
          </div>
          <div>
            <label className="text-xs text-outline">Item name *</label>
            <Input placeholder="e.g. Shirt" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-outline">Laundry price (₦) *</label>
              <Input type="number" min={0} placeholder="1000" value={form.laundryPrice} onChange={(e) => setForm({ ...form, laundryPrice: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-outline">Pressing price (₦)</label>
              <Input type="number" min={0} placeholder="Leave empty if not offered" value={form.pressingPrice} onChange={(e) => setForm({ ...form, pressingPrice: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* rename category modal */}
      <Modal isOpen={!!renameTarget} onClose={() => setRenameTarget(null)} title={`Rename Category — ${renameTarget?.name ?? ''}`} footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button variant="default" loading={busy} onClick={doRename}>Rename</Button>
        </div>
      }>
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Category name" />
        <p className="text-[10px] text-outline mt-1">All items in the category move with it. Names are uppercased and must be unique.</p>
      </Modal>

      {/* delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete" footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="destructive" loading={busy} onClick={doDelete}>Delete</Button>
        </div>
      }>
        <p className="text-sm">
          {'items' in (deleteTarget ?? {}) ? `Delete category "${(deleteTarget as LaundryCatalogCategory).name}"?` : `Delete "${(deleteTarget as LaundryItemResponse)?.item}"?`}{' '}
          This cannot be undone. Existing bills keep their recorded items.
        </p>
      </Modal>
    </div>
  );
}
