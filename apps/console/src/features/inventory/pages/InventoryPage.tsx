import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { Input, Select, Option, Drawer, Button, Table, Badge, RoomStatus, UserRole } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { inventoryApi, type InventoryItem } from '../api/inventory.api';
import { Departments } from '@citydenapartments/shared';

const LIMIT = 20;

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canWrite = user ? [UserRole.SuperAdmin, UserRole.StoreManager, UserRole.Accountant].includes(user.role as any) : false;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [actionType, setActionType] = useState<'issue' | 'restock' | null>(null);
  const [qty, setQty] = useState(1);
  const [requestedBy, setRequestedBy] = useState('');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', category: '', description: '', unit: 'pcs', currentStock: 0, reorderLevel: 0 });

  // spoilage state
  const [spoilageItem, setSpoilageItem] = useState<InventoryItem | null>(null);
  const [spoilageQty, setSpoilageQty] = useState<number>(1);
  const [spoilageType, setSpoilageType] = useState<string>('damaged');
  const [spoilageReason, setSpoilageReason] = useState<string>('');
  const [spoilageNotes, setSpoilageNotes] = useState<string>('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listItems({ page, limit: LIMIT, search: search || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch { toast('error', 'Failed to load inventory.'); }
    finally { setLoading(false); }
  }, [page, search, toast]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const openAction = (item: InventoryItem, type: 'issue' | 'restock') => {
    setActionItem(item);
    setActionType(type);
    setQty(1);
    setRequestedBy('');
    setDepartment('');
    setNotes('');
  };

  const submitAction = async () => {
    if (!actionItem || !actionType) return;
    if (qty < 1) { toast('error', 'Quantity must be at least 1.'); return; }
    if (actionType === 'issue' && qty > actionItem.currentStock) {
      toast('error', `Only ${actionItem.currentStock} ${actionItem.unit} available.`);
      return;
    }
    setSubmitting(true);
    try {
      if (actionType === 'issue') {
        await inventoryApi.issue(actionItem._id, { quantity: qty, requestedBy: requestedBy || undefined, department: department || undefined, notes: notes || undefined });
        toast('success', `Issued ${qty} ${actionItem.unit} of ${actionItem.name}.`);
      } else {
        await inventoryApi.restock(actionItem._id, { quantity: qty, notes: notes || undefined });
        toast('success', `Restocked ${qty} ${actionItem.unit} of ${actionItem.name}.`);
      }
      setActionItem(null);
      setActionType(null);
      fetchItems();
    } catch (e: any) { toast('error', e.message); }
    finally { setSubmitting(false); }
  };

  const createItem = async () => {
    if (!createForm.name || !createForm.category || !createForm.unit) {
      toast('error', 'Name, category, and unit are required.');
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.createItem(createForm);
      setShowCreate(false);
      setCreateForm({ name: '', category: '', description: '', unit: 'pcs', currentStock: 0, reorderLevel: 0 });
      toast('success', 'Item created.');
      fetchItems();
    } catch (e: any) { toast('error', e.message); }
    finally { setSubmitting(false); }
  };

  const openSpoilage = (item: InventoryItem) => {
    setSpoilageItem(item);
    setSpoilageQty(1);
    setSpoilageType('damaged');
    setSpoilageReason('');
    setSpoilageNotes('');
  };

  const submitSpoilage = async () => {
    if (!spoilageItem) return;
    if (spoilageQty < 1) { toast('error', 'Quantity must be at least 1.'); return; }
    if (spoilageQty > spoilageItem.currentStock) {
      toast('error', `Only ${spoilageItem.currentStock} ${spoilageItem.unit} available.`);
      return;
    }
    if (!spoilageReason.trim()) { toast('error', 'Reason is required.'); return; }
    setSubmitting(true);
    try {
      await inventoryApi.reportSpoilage(spoilageItem._id, {
        quantity: spoilageQty,
        spoilageType,
        reason: spoilageReason,
        notes: spoilageNotes || undefined,
      });
      toast('success', 'Write-off reported. Awaiting approval.');
      setSpoilageItem(null);
      fetchItems();
    } catch (e: any) { toast('error', e.message); }
    finally { setSubmitting(false); }
  };

  const isLowStock = (item: InventoryItem) => item.currentStock <= item.reorderLevel;

  const columns: TableProps<InventoryItem>['columns'] = [
    { title: 'Item', key: 'item', render: (_: unknown, r: InventoryItem) => (
      <div className="flex items-center gap-2">
        <Package size={14} className={isLowStock(r) ? 'text-amber-500' : 'text-primary'} />
        <div><p className="font-medium">{r.name}</p><p className="text-xs text-outline">{r.category} · {r.unit}</p></div>
      </div>
    )},
    { title: 'Stock', dataIndex: 'currentStock', key: 'stock', width: 100, align: 'right' as const,
      render: (v: number, r: InventoryItem) => (
        <span className={`font-bold font-mono ${v === 0 ? 'text-red-500' : isLowStock(r) ? 'text-amber-500' : 'text-emerald-500'}`}>
          {v}
          {isLowStock(r) && <AlertTriangle size={12} className="inline ml-1" />}
        </span>
      )},
    { title: 'Reorder At', dataIndex: 'reorderLevel', key: 'reorder', width: 100, align: 'right' as const,
      render: (v: number) => <span className="font-mono text-outline">{v}</span> },
    { title: 'Actions', key: 'action', width: 280,
      render: (_: unknown, r: InventoryItem) => (
        <div className="flex gap-2">
          {canWrite && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); openAction(r, 'issue'); }}>Issue</Button>
          )}
          {canWrite && (
            <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); openAction(r, 'restock'); }}>Restock</Button>
          )}
          {canWrite && (
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); openSpoilage(r); }}>Write Off</Button>
          )}
        </div>
      )},
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Store</span></div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Inventory</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search items..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          {canWrite && <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Add Item</Button>}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<InventoryItem>
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page, pageSize: LIMIT, total,
            showSizeChanger: true,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      <Drawer open={!!actionItem} onClose={() => { setActionItem(null); setActionType(null); }}
        title={actionType === 'issue' ? 'Issue Item' : 'Restock Item'} size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => { setActionItem(null); setActionType(null); }}>Cancel</Button>
          <Button loading={submitting} onClick={submitAction}>
            {actionType === 'issue' ? 'Issue' : 'Restock'}
          </Button></div>}>
        {actionItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container">
              <p className="font-medium text-sm">{actionItem.name}</p>
              <p className="text-xs text-outline">{actionItem.category} · Current stock: <strong>{actionItem.currentStock}</strong> {actionItem.unit}</p>
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Quantity</label>
              <Input size="lg" type="number" min={1} max={actionType === 'issue' ? actionItem.currentStock : undefined}
                value={qty} onChange={(e) => setQty(Number(e.target.value))} className="mt-1" />
            </div>
            {actionType === 'issue' && (
              <>
                <div>
                  <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Requested By (Individual)</label>
                  <Input size="lg" placeholder="Person's name" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Or Department</label>
                  <Select size="lg" className="w-full mt-1" value={department} onChange={(v) => setDepartment(v)}>
                    <Option value="">None</Option>
                    {Departments.map((d) => <Option key={d} value={d}>{d}</Option>)}
                  </Select>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Notes</label>
              <Input size="lg" placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Add Inventory Item" size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button loading={submitting} onClick={createItem}>Create</Button></div>}>
        <div className="space-y-4">
          <Input size="lg" placeholder="Item Name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          <Input size="lg" placeholder="Category" value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} />
          <Input size="lg" placeholder="Description (optional)" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          <Select size="lg" className="w-full" value={createForm.unit} onChange={(v) => setCreateForm({ ...createForm, unit: v })}>
            <Option value="pcs">Pieces (pcs)</Option>
            <Option value="kg">Kilograms (kg)</Option>
            <Option value="litres">Litres</Option>
            <Option value="packs">Packs</Option>
            <Option value="rolls">Rolls</Option>
            <Option value="bottles">Bottles</Option>
            <Option value="bags">Bags</Option>
            <Option value="cartons">Cartons</Option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Initial Stock</label>
              <Input size="lg" type="number" min={0} value={createForm.currentStock} onChange={(e) => setCreateForm({ ...createForm, currentStock: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Reorder Level</label>
              <Input size="lg" type="number" min={0} value={createForm.reorderLevel} onChange={(e) => setCreateForm({ ...createForm, reorderLevel: Number(e.target.value) })} className="mt-1" />
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer open={!!spoilageItem} onClose={() => setSpoilageItem(null)} title="Report Write-Off" size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setSpoilageItem(null)}>Cancel</Button>
          <Button loading={submitting} onClick={submitSpoilage}>Report Write-Off</Button></div>}>
        {spoilageItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container">
              <p className="font-medium text-sm">{spoilageItem.name}</p>
              <p className="text-xs text-outline">{spoilageItem.category} · Current stock: <strong>{spoilageItem.currentStock}</strong> {spoilageItem.unit}</p>
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Quantity</label>
              <Input size="lg" type="number" min={1} max={spoilageItem.currentStock}
                value={spoilageQty} onChange={(e) => setSpoilageQty(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Type</label>
              <Select size="lg" className="w-full mt-1" value={spoilageType} onChange={(v) => setSpoilageType(v)}>
                <Option value="expired">Expired</Option>
                <Option value="damaged">Damaged</Option>
                <Option value="contaminated">Contaminated</Option>
                <Option value="stolen">Stolen</Option>
                <Option value="lost">Lost</Option>
                <Option value="other">Other</Option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Reason *</label>
              <Input size="lg" placeholder="Why is this being written off?" value={spoilageReason} onChange={(e) => setSpoilageReason(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Notes (optional)</label>
              <Input size="lg" placeholder="Additional notes" value={spoilageNotes} onChange={(e) => setSpoilageNotes(e.target.value)} className="mt-1" />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
