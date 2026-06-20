import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Plus, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { Input, Select, Option, Drawer, Modal, Button } from '@citydenapartments/shared';
import { UserRole } from '@citydenapartments/shared';
import { Can, can } from '../../../components/ui/Can';
import { inventoryApi, type InventoryItem } from '../api/inventory.api';
import { employeesApi, type Employee } from '../../employees/api/employees.api';
import { Departments } from '@citydenapartments/shared';
import { format, isBefore, addDays, differenceInDays } from 'date-fns';

const LIMIT = 20;

export default function InventoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = can(user, [UserRole.StoreManager, UserRole.SuperAdmin, UserRole.Accountant]);
  const canIssue = can(user, [UserRole.StoreKeeper, UserRole.StoreManager, UserRole.SuperAdmin]);

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
  const [createForm, setCreateForm] = useState({ name: '', category: '', description: '', unit: 'pcs', currentStock: 0, reorderLevel: 0, costPrice: '' as string | number, expiryDate: '' });

  const [empSearch, setEmpSearch] = useState('');
  const [empResults, setEmpResults] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSelectedId, setEmpSelectedId] = useState<string | null>(null);
  const [empFocus, setEmpFocus] = useState(false);

  const [spoilItem, setSpoilItem] = useState<InventoryItem | null>(null);
  const [spoilQty, setSpoilQty] = useState(1);
  const [spoilType, setSpoilType] = useState('expired');
  const [spoilReason, setSpoilReason] = useState('');
  const [spoilNotes, setSpoilNotes] = useState('');

  const spoilTypes = [
    { value: 'expired', label: 'Expired' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'contaminated', label: 'Contaminated' },
    { value: 'stolen', label: 'Stolen' },
    { value: 'lost', label: 'Lost' },
    { value: 'other', label: 'Other' },
  ];

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

  const empTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!empSearch.trim() || empSelectedId) { setEmpResults([]); return; }
    setEmpLoading(true);
    clearTimeout(empTimer.current);
    empTimer.current = setTimeout(async () => {
      try {
        const res = await employeesApi.search(empSearch);
        setEmpResults(res);
      } catch { /* ignore */ }
      finally { setEmpLoading(false); }
    }, 300);
    return () => clearTimeout(empTimer.current!);
  }, [empSearch, empSelectedId]);

  const selectEmployee = (emp: Employee) => {
    setRequestedBy(emp.name);
    setEmpSelectedId(emp._id);
    setEmpSearch('');
    setEmpResults([]);
    if (emp.department && !department) setDepartment(emp.department);
  };

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
    setEmpSelectedId(null);
    setEmpSearch('');
    setEmpResults([]);
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
        await inventoryApi.issue(actionItem._id, { quantity: qty, requestedBy: requestedBy || undefined, requestedEmployeeId: empSelectedId || undefined, department: department || undefined, notes: notes || undefined });
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
      await inventoryApi.createItem({
        ...createForm,
        costPrice: createForm.costPrice ? Number(createForm.costPrice) : undefined,
        expiryDate: createForm.expiryDate || undefined,
      });
      setShowCreate(false);
      setCreateForm({ name: '', category: '', description: '', unit: 'pcs', currentStock: 0, reorderLevel: 0, costPrice: '', expiryDate: '' });
      toast('success', 'Item created.');
      fetchItems();
    } catch (e: any) { toast('error', e.message); }
    finally { setSubmitting(false); }
  };

  const openSpoilage = (item: InventoryItem) => {
    setSpoilItem(item);
    setSpoilQty(1);
    setSpoilType('expired');
    setSpoilReason('');
    setSpoilNotes('');
  };

  const submitSpoilage = async () => {
    if (!spoilItem) return;
    if (spoilQty < 1) { toast('error', 'Quantity must be at least 1.'); return; }
    if (spoilQty > spoilItem.currentStock) { toast('error', `Only ${spoilItem.currentStock} ${spoilItem.unit} available.`); return; }
    if (!spoilReason.trim()) { toast('error', 'Reason is required.'); return; }
    setSubmitting(true);
    try {
      await inventoryApi.reportSpoilage(spoilItem._id, {
        quantity: spoilQty,
        spoilageType: spoilType,
        reason: spoilReason,
        notes: spoilNotes || undefined,
      });
      toast('success', 'Spoilage reported. Awaiting approval.');
      setSpoilItem(null);
      fetchItems();
    } catch (e: any) { toast('error', e.message); }
    finally { setSubmitting(false); }
  };

  const isLowStock = (item: InventoryItem) => item.currentStock <= item.reorderLevel;
  const isExpired = (item: InventoryItem) => item.expiryDate && isBefore(new Date(item.expiryDate), new Date());
  const isExpiringSoon = (item: InventoryItem) => {
    if (!item.expiryDate || isExpired(item)) return false;
    return differenceInDays(new Date(item.expiryDate), new Date()) <= 30;
  };
  const stockColor = (item: InventoryItem) => {
    if (isExpired(item)) return 'text-red-500';
    if (item.currentStock === 0) return 'text-red-500';
    if (isLowStock(item)) return 'text-amber-500';
    return 'text-emerald-500';
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Store</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Inventory</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search items..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-56" />
          {isManager && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Add Item</Button>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item._id} className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isLowStock(item) ? 'bg-amber-50' : 'bg-surface-container'}`}>
                <Package size={16} className={stockColor(item)} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-on-surface truncate">{item.name}</p>
                <p className="text-xs text-on-surface-variant">{item.category} · {item.unit}</p>
                {item.costPrice != null && (
                  <p className="text-[10px] text-outline">Cost: ₦{item.costPrice.toLocaleString()}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {item.expiryDate && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      isExpired(item) ? 'bg-red-50 text-red-600' :
                      isExpiringSoon(item) ? 'bg-amber-50 text-amber-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isExpired(item) || isExpiringSoon(item) ? 'animate-pulse bg-current' : 'bg-current'
                      }`} />
                      {isExpired(item) ? `Expired ${format(new Date(item.expiryDate), 'MMM d, yyyy')}` :
                       `Exp ${format(new Date(item.expiryDate), 'MMM d, yyyy')}`}
                    </span>
                  )}
                  {isLowStock(item) && item.currentStock > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">
                      <AlertTriangle size={10} className="animate-pulse" />
                      Low Stock
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="text-right">
                <p className={`text-lg font-bold ${stockColor(item)}`}>{item.currentStock}</p>
                <p className="text-[10px] text-outline">Reorder at {item.reorderLevel}</p>
              </div>
              {isExpired(item) && (
                <Clock size={16} className="text-red-500" />
              )}
              {!isExpired(item) && isLowStock(item) && item.currentStock > 0 && (
                <AlertTriangle size={16} className="text-amber-500" />
              )}
              {!isExpired(item) && item.currentStock === 0 && (
                <AlertTriangle size={16} className="text-red-500" />
              )}
              <div className="flex gap-2">
                {canIssue && (
                  <button onClick={() => openAction(item, 'issue')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-outline-variant hover:bg-surface-container cursor-pointer bg-transparent text-on-surface-variant hover:text-on-surface">
                    <ArrowDownCircle size={12} /> Issue
                  </button>
                )}
                {isManager && (
                  <button onClick={() => openAction(item, 'restock')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-outline-variant hover:bg-surface-container cursor-pointer bg-transparent text-on-surface-variant hover:text-on-surface">
                    <ArrowUpCircle size={12} /> Restock
                  </button>
                )}
                {isManager && (
                  <button onClick={() => openSpoilage(item)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded border border-red-200 hover:bg-red-50 cursor-pointer bg-transparent text-red-500 hover:text-red-600">
                    <Trash2 size={12} /> Write Off
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <p className="text-center text-sm text-outline py-12">No items found.</p>
        )}
        {total > LIMIT && (
          <div className="flex justify-center gap-2 mt-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs rounded border border-outline-variant disabled:opacity-30 cursor-pointer disabled:cursor-default">Previous</button>
            <span className="px-3 py-1 text-xs text-outline">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <button disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs rounded border border-outline-variant disabled:opacity-30 cursor-pointer disabled:cursor-default">Next</button>
          </div>
        )}
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
                <div className="relative">
                  <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Requested By</label>
                  <div className="relative mt-1">
                    <Input size="lg" placeholder="Search employee or type a name"
                      value={empSelectedId ? requestedBy : empSearch}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setRequestedBy(e.target.value);
                        setEmpSelectedId(null);
                      }}
                      onFocus={() => setEmpFocus(true)}
                      onBlur={() => setTimeout(() => setEmpFocus(false), 200)} />
                    {empSelectedId && (
                      <button onClick={() => { setEmpSelectedId(null); setEmpSearch(''); setRequestedBy(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-outline text-xs hover:text-on-surface cursor-pointer bg-transparent border-0">
                        Clear
                      </button>
                    )}
                  </div>
                  {empFocus && empResults.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-lg max-h-48 overflow-y-auto">
                      {empResults.map((emp) => (
                        <button key={emp._id} onMouseDown={() => selectEmployee(emp)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-container transition-colors cursor-pointer border-0 bg-transparent">
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-[10px] text-outline">{emp.position || emp.department || ''}{emp.position && emp.department ? ` · ${emp.department}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {empFocus && empLoading && (
                    <div className="absolute z-10 left-0 right-0 mt-1 p-3 text-center text-xs text-outline bg-surface-container-lowest rounded-lg border border-outline-variant shadow-lg">
                      Searching...
                    </div>
                  )}
                  {empSelectedId && (
                    <input type="hidden" />
                  )}
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

      <Drawer open={!!spoilItem} onClose={() => setSpoilItem(null)} title="Report Spoilage / Write-Off" size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setSpoilItem(null)}>Cancel</Button>
          <Button loading={submitting} onClick={submitSpoilage} variant="destructive">Submit for Approval</Button></div>}>
        {spoilItem && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container">
              <p className="font-medium text-sm">{spoilItem.name}</p>
              <p className="text-xs text-outline">{spoilItem.category} · Current stock: <strong>{spoilItem.currentStock}</strong> {spoilItem.unit}</p>
              {spoilItem.expiryDate && (
                <p className="text-xs text-outline mt-1">Expires: {format(new Date(spoilItem.expiryDate), 'MMM d, yyyy')}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Quantity</label>
              <Input size="lg" type="number" min={1} max={spoilItem.currentStock}
                value={spoilQty} onChange={(e) => setSpoilQty(Number(e.target.value))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Spoilage Type</label>
              <Select size="lg" className="w-full mt-1" value={spoilType} onChange={(v) => setSpoilType(v)}>
                {spoilTypes.map((t) => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Reason <span className="text-red-500">*</span></label>
              <Input size="lg" placeholder="Explain why this is being written off" value={spoilReason}
                onChange={(e) => setSpoilReason(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Additional Notes</label>
              <Input size="lg" placeholder="Optional details" value={spoilNotes}
                onChange={(e) => setSpoilNotes(e.target.value)} className="mt-1" />
            </div>
            <p className="text-xs text-outline bg-amber-50 p-2 rounded border border-amber-200">
              This report will be sent for approval. Stock will only be deducted after a manager or GM approves.
            </p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Cost Price (₦)</label>
              <Input size="lg" type="number" min={0} placeholder="Optional" value={createForm.costPrice}
                onChange={(e) => setCreateForm({ ...createForm, costPrice: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Expiry Date</label>
              <Input size="lg" type="date" value={createForm.expiryDate}
                onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })} className="mt-1" />
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
