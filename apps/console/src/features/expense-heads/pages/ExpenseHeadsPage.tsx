import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Input, Drawer, Badge, Modal } from '@citydenapartments/shared';
import { Plus, Search, Tag, CheckCircle, XCircle, Edit, Layers, DollarSign, Wallet } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { useAuth } from '../../../contexts/auth';
import { expenseHeadsApi } from '../api/expense-heads.api';
import { ExpenseHeadType, type ExpenseHeadResponse, type ExpenseHeadTypeType } from '@citydenapartments/shared';

export default function ExpenseHeadsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [heads, setHeads] = useState<ExpenseHeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'revenue_head' | 'expenditure_head'>('all');
  const [search, setSearch] = useState('');

  // Drawer / Form state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingHead, setEditingHead] = useState<ExpenseHeadResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    type: ExpenseHeadTypeType;
    description: string;
    isActive: boolean;
  }>({
    name: '',
    type: ExpenseHeadType.RevenueHead,
    description: '',
    isActive: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await expenseHeadsApi.list({ includeInactive: true });
      setHeads(data);
    } catch (err: any) {
      toast('error', err.message || 'Failed to load expense heads');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const revenueHeads = useMemo(
    () => heads.filter((h) => h.type === ExpenseHeadType.RevenueHead),
    [heads],
  );

  const expenditureHeads = useMemo(
    () => heads.filter((h) => h.type === ExpenseHeadType.ExpenditureHead),
    [heads],
  );

  const filteredHeads = useMemo(() => {
    return heads.filter((h) => {
      if (activeTab === 'revenue_head' && h.type !== ExpenseHeadType.RevenueHead) return false;
      if (activeTab === 'expenditure_head' && h.type !== ExpenseHeadType.ExpenditureHead) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return h.name.toLowerCase().includes(q) || (h.description && h.description.toLowerCase().includes(q));
      }
      return true;
    });
  }, [heads, activeTab, search]);

  const openCreate = (defaultType?: ExpenseHeadTypeType) => {
    setEditingHead(null);
    setForm({
      name: '',
      type: defaultType || (activeTab === 'expenditure_head' ? ExpenseHeadType.ExpenditureHead : ExpenseHeadType.RevenueHead),
      description: '',
      isActive: true,
    });
    setShowDrawer(true);
  };

  const openEdit = (head: ExpenseHeadResponse) => {
    setEditingHead(head);
    setForm({
      name: head.name,
      type: head.type,
      description: head.description || '',
      isActive: head.isActive,
    });
    setShowDrawer(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast('error', 'Expense head name is required.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingHead) {
        await expenseHeadsApi.update(editingHead._id, {
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });
        toast('success', `Expense head "${form.name}" updated successfully.`);
      } else {
        await expenseHeadsApi.create({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || undefined,
          isActive: form.isActive,
        });
        toast('success', `Expense head "${form.name}" created successfully.`);
      }
      setShowDrawer(false);
      loadData();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save expense head.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (head: ExpenseHeadResponse) => {
    try {
      await expenseHeadsApi.toggleActive(head._id);
      toast('success', `${head.name} is now ${head.isActive ? 'deactivated' : 'activated'}.`);
      loadData();
    } catch (err: any) {
      toast('error', err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Settings & Finance</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Expense Heads</h1>
          <p className="text-sm text-outline mt-1">
            Manage Revenue Heads (Cost of Sales / Direct Allocation) and Expenditure Heads (Operational & Overhead Expenses).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" icon={<Plus size={14} />} onClick={() => openCreate()}>
            Add Expense Head
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Active Heads</span>
            <CheckCircle size={15} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {heads.filter((h) => h.isActive).length}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-teal-500/20 bg-teal-50/30 dark:bg-teal-950/10 shadow-sm">
          <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Revenue Heads</span>
            <DollarSign size={15} />
          </div>
          <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">
            {revenueHeads.length}
          </p>
          <p className="text-[11px] text-teal-600/70 mt-0.5">Accommodation, Kitchen, Bar, Laundry...</p>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/10 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Expenditure Heads</span>
            <Wallet size={15} />
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {expenditureHeads.length}
          </p>
          <p className="text-[11px] text-purple-600/70 mt-0.5">Salary, Diesel, Electricity, Repairs...</p>
        </div>

        <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inactive / Disabled</span>
            <XCircle size={15} className="text-outline" />
          </div>
          <p className="text-2xl font-bold text-outline">
            {heads.filter((h) => !h.isActive).length}
          </p>
        </div>
      </div>

      {/* Filter and Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-surface-container rounded-lg">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-outline hover:text-on-surface bg-transparent'
            }`}
          >
            All Heads ({heads.length})
          </button>
          <button
            onClick={() => setActiveTab('revenue_head')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'revenue_head'
                ? 'bg-surface-container-lowest text-teal-700 dark:text-teal-400 shadow-sm'
                : 'text-outline hover:text-on-surface bg-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            Revenue Heads ({revenueHeads.length})
          </button>
          <button
            onClick={() => setActiveTab('expenditure_head')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'expenditure_head'
                ? 'bg-surface-container-lowest text-purple-700 dark:text-purple-400 shadow-sm'
                : 'text-outline hover:text-on-surface bg-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Expenditure Heads ({expenditureHeads.length})
          </button>
        </div>

        <div className="flex items-center gap-2 max-w-xs w-full">
          <div className="relative w-full">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
            <input
              type="text"
              placeholder="Search heads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-surface-container-lowest border border-outline-variant text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Grid of Expense Heads */}
      {loading ? (
        <div className="text-center py-12 text-sm text-outline">Loading expense heads...</div>
      ) : filteredHeads.length === 0 ? (
        <div className="text-center py-12 bg-surface-container-lowest rounded-xl border border-outline-variant space-y-3">
          <Tag size={32} className="mx-auto text-outline/50" />
          <p className="text-sm font-medium text-on-surface">No expense heads found</p>
          <p className="text-xs text-outline">
            {search ? 'Try clearing your search term.' : 'Click "Add Expense Head" to create your first item.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredHeads.map((head) => {
            const isRevenue = head.type === ExpenseHeadType.RevenueHead;
            return (
              <div
                key={head._id}
                className={`p-4 rounded-xl border transition-all ${
                  head.isActive
                    ? 'bg-surface-container-lowest border-outline-variant shadow-sm hover:border-primary/40'
                    : 'bg-surface-container-lowest/50 border-outline-variant/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isRevenue
                          ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                          : 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                      }`}
                    >
                      {isRevenue ? 'Revenue Head' : 'Expenditure Head'}
                    </span>
                    <h3 className="font-bold text-sm text-on-surface mt-1.5 truncate">
                      {head.name}
                    </h3>
                  </div>

                  <span
                    className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      head.isActive ? 'bg-emerald-500' : 'bg-outline'
                    }`}
                    title={head.isActive ? 'Active' : 'Inactive'}
                  />
                </div>

                {head.description && (
                  <p className="text-xs text-outline line-clamp-2 min-h-[32px] mb-3">
                    {head.description}
                  </p>
                )}
                {!head.description && <div className="min-h-[32px] mb-3" />}

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60">
                  <span className="text-[10px] text-outline">
                    {head.isDefault ? 'Standard Default' : 'Custom Added'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggle(head)}
                      className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                        head.isActive
                          ? 'bg-transparent text-outline hover:text-error hover:bg-error/10'
                          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                      }`}
                    >
                      {head.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEdit(head)}
                      className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
                      title="Edit Head"
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Drawer */}
      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={editingHead ? 'Edit Expense Head' : 'Add Expense Head'}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>
              Cancel
            </Button>
            <Button
              htmlType="submit"
              form="expense-head-form"
              loading={submitting}
              disabled={!form.name.trim()}
            >
              {editingHead ? 'Save Changes' : 'Create Head'}
            </Button>
          </div>
        }
      >
        <form id="expense-head-form" onSubmit={handleSubmit} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
              Section / Head Category *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                  form.type === ExpenseHeadType.RevenueHead
                    ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 text-teal-800 dark:text-teal-200'
                    : 'border-outline-variant bg-surface hover:border-outline text-outline'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Revenue Head</span>
                  <input
                    type="radio"
                    name="headType"
                    checked={form.type === ExpenseHeadType.RevenueHead}
                    onChange={() => setForm({ ...form, type: ExpenseHeadType.RevenueHead })}
                    className="sr-only"
                  />
                </div>
                <span className="text-[10px] text-outline mt-1">Cost of sales / Direct department costs</span>
              </label>

              <label
                className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                  form.type === ExpenseHeadType.ExpenditureHead
                    ? 'border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 text-purple-800 dark:text-purple-200'
                    : 'border-outline-variant bg-surface hover:border-outline text-outline'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Expenditure Head</span>
                  <input
                    type="radio"
                    name="headType"
                    checked={form.type === ExpenseHeadType.ExpenditureHead}
                    onChange={() => setForm({ ...form, type: ExpenseHeadType.ExpenditureHead })}
                    className="sr-only"
                  />
                </div>
                <span className="text-[10px] text-outline mt-1">Operating & overhead expenses (OPEX)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1">
              Head Name *
            </label>
            <Input
              placeholder="e.g. Diesel, Laundry, Salary, Electricity"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <Input
              placeholder="e.g. Fuel for generator and utility fleet"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-xs font-semibold text-on-surface">Active & Available for Expense Logging</span>
            </label>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
