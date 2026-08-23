import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Eye, Receipt, Building2, Printer, Filter, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Input, Select, Option, Drawer, Button, Table, Badge, Modal, PrintableLetterhead } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { UserRole, ExpenseHeadType, type ExpenseHeadResponse, type ExpenseHeadTypeType } from '@citydenapartments/shared';
import { departmentsApi } from '../../departments/api/departments.api';
import { expenseHeadsApi } from '../../expense-heads/api/expense-heads.api';
import { expensesApi, type DepartmentExpenseEntry, type ExpenseGroup } from '../api/department-expenses.api';

const LIMIT = 25;

function DetailDrawer({ entry, open, onClose }: { entry: DepartmentExpenseEntry | null; open: boolean; onClose: () => void }) {
  if (!entry) return null;

  const isRevenue = entry.headType === ExpenseHeadType.RevenueHead;

  return (
    <Drawer open={open} onClose={onClose} title="Expense Detail" size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Department</p>
            <p className="text-sm font-semibold text-on-surface">{entry.departmentId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Amount</p>
            <p className="text-lg font-bold text-on-surface font-mono">₦{entry.amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Section</p>
            <span
              className={`inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isRevenue
                  ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
              }`}
            >
              {isRevenue ? 'Revenue Head (Direct)' : 'Expenditure Head (OPEX)'}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Expense Head</p>
            <p className="text-sm font-bold text-on-surface">{entry.expenseHead || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Description</p>
            <p className="text-sm text-on-surface bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant">
              {entry.description}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Period Start</p>
            <p className="text-sm">{format(new Date(entry.fromDate), 'd MMM yyyy')}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Period End</p>
            <p className="text-sm">{format(new Date(entry.toDate), 'd MMM yyyy')}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Logged By</p>
            <p className="text-sm">{entry.loggedBy?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Logged At</p>
            <p className="text-xs text-outline">{format(new Date(entry.createdAt), 'd MMM yyyy, h:mm a')}</p>
          </div>
          {entry.updatedBy && (
            <div className="col-span-2">
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Last Updated By</p>
              <p className="text-sm">{entry.updatedBy.name} · {format(new Date(entry.updatedAt), 'd MMM yyyy, h:mm a')}</p>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

export default function DepartmentExpensesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<DepartmentExpenseEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedHeadType, setSelectedHeadType] = useState('');
  const [selectedExpenseHead, setSelectedExpenseHead] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DepartmentExpenseEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [heads, setHeads] = useState<ExpenseHeadResponse[]>([]);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{
    departmentId: string;
    headType: ExpenseHeadTypeType;
    expenseHead: string;
    expenseHeadId: string;
    amount: string;
    description: string;
    fromDate: string;
    toDate: string;
  }>({
    departmentId: '',
    headType: ExpenseHeadType.RevenueHead,
    expenseHead: '',
    expenseHeadId: '',
    amount: '',
    description: '',
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    toDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [submitting, setSubmitting] = useState(false);

  // Edit form state
  const [editEntry, setEditEntry] = useState<DepartmentExpenseEntry | null>(null);
  const [editForm, setEditForm] = useState<{
    departmentId: string;
    headType: ExpenseHeadTypeType;
    expenseHead: string;
    expenseHeadId: string;
    amount: string;
    description: string;
    fromDate: string;
    toDate: string;
  }>({
    departmentId: '',
    headType: ExpenseHeadType.RevenueHead,
    expenseHead: '',
    expenseHeadId: '',
    amount: '',
    description: '',
    fromDate: '',
    toDate: '',
  });
  const [showEdit, setShowEdit] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const canWrite = user ? [UserRole.Accountant, UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager].includes(user.role as any) : false;

  useEffect(() => {
    if (!user?.activeBranchId) return;
    departmentsApi.list(user.activeBranchId).then((res) => {
      const depts = Array.isArray(res) ? res : (res as any).items || [];
      setDepartments(depts);
    }).catch(() => {});
  }, [user?.activeBranchId]);

  useEffect(() => {
    expenseHeadsApi.list({ includeInactive: false }).then(setHeads).catch(() => {});
  }, []);

  useEffect(() => {
    expensesApi.getGroups().then(setGroups).catch(() => {});
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expensesApi.list({
        departmentId: selectedDeptId || undefined,
        headType: selectedHeadType || undefined,
        expenseHead: selectedExpenseHead || undefined,
        page,
        limit: LIMIT,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      toast('error', 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [selectedDeptId, selectedHeadType, selectedExpenseHead, page, toast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    setPage(1);
  }, [selectedDeptId, selectedHeadType, selectedExpenseHead]);

  const activeRevenueHeads = useMemo(
    () => heads.filter((h) => h.type === ExpenseHeadType.RevenueHead && h.isActive),
    [heads],
  );

  const activeExpenditureHeads = useMemo(
    () => heads.filter((h) => h.type === ExpenseHeadType.ExpenditureHead && h.isActive),
    [heads],
  );

  const availableHeadsForCreate = createForm.headType === ExpenseHeadType.RevenueHead ? activeRevenueHeads : activeExpenditureHeads;
  const availableHeadsForEdit = editForm.headType === ExpenseHeadType.RevenueHead ? activeRevenueHeads : activeExpenditureHeads;

  const openDetail = (entry: DepartmentExpenseEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  const handleOpenCreate = () => {
    setCreateForm({
      departmentId: selectedDeptId || (departments[0]?._id || ''),
      headType: ExpenseHeadType.RevenueHead,
      expenseHead: activeRevenueHeads[0]?.name || '',
      expenseHeadId: activeRevenueHeads[0]?._id || '',
      amount: '',
      description: '',
      fromDate: format(new Date(), 'yyyy-MM-dd'),
      toDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.departmentId || !createForm.expenseHead || !createForm.amount || !createForm.description || !createForm.fromDate || !createForm.toDate) {
      toast('error', 'Please fill all required fields including Department and Expense Head.');
      return;
    }
    setSubmitting(true);
    try {
      await expensesApi.create({
        departmentId: createForm.departmentId,
        headType: createForm.headType,
        expenseHead: createForm.expenseHead,
        expenseHeadId: createForm.expenseHeadId || undefined,
        amount: Number(createForm.amount),
        description: createForm.description,
        fromDate: createForm.fromDate,
        toDate: createForm.toDate,
      });
      toast('success', 'Expense logged successfully.');
      setShowCreate(false);
      fetchExpenses();
      const updated = await expensesApi.getGroups();
      setGroups(updated);
    } catch (err: any) {
      toast('error', err.message || 'Failed to log expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (entry: DepartmentExpenseEntry) => {
    setEditEntry(entry);
    setEditForm({
      departmentId: entry.departmentId?._id || '',
      headType: entry.headType || ExpenseHeadType.RevenueHead,
      expenseHead: entry.expenseHead || '',
      expenseHeadId: typeof entry.expenseHeadId === 'object' ? entry.expenseHeadId?._id : entry.expenseHeadId || '',
      amount: String(entry.amount),
      description: entry.description,
      fromDate: format(new Date(entry.fromDate), 'yyyy-MM-dd'),
      toDate: format(new Date(entry.toDate), 'yyyy-MM-dd'),
    });
    setShowEdit(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;
    setSubmitting(true);
    try {
      await expensesApi.update(editEntry._id, {
        departmentId: editForm.departmentId,
        headType: editForm.headType,
        expenseHead: editForm.expenseHead,
        expenseHeadId: editForm.expenseHeadId || undefined,
        amount: Number(editForm.amount),
        description: editForm.description,
        fromDate: editForm.fromDate,
        toDate: editForm.toDate,
      });
      toast('success', 'Expense updated successfully.');
      setShowEdit(false);
      setEditEntry(null);
      fetchExpenses();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGroup = groups.find((g) => g.departmentId === selectedDeptId);

  const columns: TableProps<DepartmentExpenseEntry>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'fromDate',
      key: 'fromDate',
      width: 120,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="text-xs font-mono">{format(new Date(r.fromDate), 'd MMM yyyy')}</span>
      ),
    },
    {
      title: 'Department',
      dataIndex: ['departmentId', 'name'],
      key: 'department',
      width: 140,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="inline-flex items-center gap-1.5 font-bold text-xs text-on-surface">
          <Building2 size={13} className="text-primary shrink-0" />
          {r.departmentId?.name || '—'}
        </span>
      ),
    },
    {
      title: 'Category & Head',
      key: 'head',
      width: 180,
      render: (_: unknown, r: DepartmentExpenseEntry) => {
        const isRevenue = r.headType === ExpenseHeadType.RevenueHead;
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs text-on-surface">
              {r.expenseHead || '—'}
            </span>
            {r.headType && (
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded w-fit ${
                  isRevenue
                    ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                    : 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                }`}
              >
                {isRevenue ? 'Revenue Head' : 'Expenditure Head'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="font-mono font-bold text-sm text-on-surface">₦{r.amount.toLocaleString()}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Period',
      key: 'period',
      width: 140,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="text-xs text-outline">
          {format(new Date(r.fromDate), 'd MMM')} — {format(new Date(r.toDate), 'd MMM yyyy')}
        </span>
      ),
    },
    {
      title: 'Logged By',
      dataIndex: ['loggedBy', 'name'],
      key: 'loggedBy',
      width: 120,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="text-xs text-outline">{r.loggedBy?.name || '—'}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openDetail(r); }}
            className="p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer bg-transparent border-none transition-colors"
            title="View details"
          >
            <Eye size={14} />
          </button>
          {canWrite && (
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(r); }}
              className="p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer bg-transparent border-none transition-colors text-xs font-semibold"
              title="Edit"
            >
              Edit
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Finance & Audits</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Receipt size={24} className="text-outline" />
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Department Expenses</h1>
            <p className="text-xs text-outline mt-0.5">
              Log, track, and audit property operational expenses classified by Department and Expense Head.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintModal(true)}
            icon={<Printer size={14} />}
          >
            Print Expense Report
          </Button>
          {canWrite && (
            <Button size="sm" onClick={handleOpenCreate} icon={<Plus size={14} />}>
              Log Expense
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar (Department, Section, Head) */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-container p-3 rounded-lg border border-outline-variant/50">
        <div className="flex items-center gap-1.5 text-xs font-bold text-outline uppercase tracking-wider">
          <Filter size={14} /> Filters:
        </div>

        {/* Department Filter */}
        <div className="w-44">
          <Select
            value={selectedDeptId}
            onChange={(val) => setSelectedDeptId(val as string)}
          >
            <Option value="">All Departments</Option>
            {departments.map((d) => (
              <Option key={d._id} value={d._id}>{d.name}</Option>
            ))}
          </Select>
        </div>

        {/* Head Section Filter */}
        <div className="w-48">
          <Select
            value={selectedHeadType}
            onChange={(val) => {
              setSelectedHeadType(val as string);
              setSelectedExpenseHead('');
            }}
          >
            <Option value="">All Categories (Rev & Exp)</Option>
            <Option value={ExpenseHeadType.RevenueHead}>Revenue Heads (Direct)</Option>
            <Option value={ExpenseHeadType.ExpenditureHead}>Expenditure Heads (OPEX)</Option>
          </Select>
        </div>

        {/* Specific Head Filter */}
        <div className="w-48">
          <Select
            value={selectedExpenseHead}
            onChange={(val) => setSelectedExpenseHead(val as string)}
          >
            <Option value="">All Expense Heads</Option>
            {(selectedHeadType === ExpenseHeadType.RevenueHead
              ? activeRevenueHeads
              : selectedHeadType === ExpenseHeadType.ExpenditureHead
              ? activeExpenditureHeads
              : heads
            ).map((h) => (
              <Option key={h._id} value={h.name}>{h.name}</Option>
            ))}
          </Select>
        </div>

        {(selectedDeptId || selectedHeadType || selectedExpenseHead) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDeptId('');
              setSelectedHeadType('');
              setSelectedExpenseHead('');
            }}
            className="text-xs text-outline"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Department Tab Highlights */}
      {groups.length > 0 && (
        <div className="flex gap-1 p-1 rounded bg-surface-container w-full overflow-x-auto">
          <button
            key="all"
            onClick={() => setSelectedDeptId('')}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-sm transition-all whitespace-nowrap cursor-pointer"
            style={{
              background: !selectedDeptId ? 'var(--color-surface-container-lowest)' : 'transparent',
              color: !selectedDeptId ? 'var(--color-on-surface)' : 'var(--color-outline)',
              boxShadow: !selectedDeptId ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Building2 size={12} />
            All Departments
          </button>
          {groups.map((g) => (
            <button
              key={g.departmentId}
              onClick={() => setSelectedDeptId(g.departmentId)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-sm transition-all whitespace-nowrap cursor-pointer"
              style={{
                background: selectedDeptId === g.departmentId ? 'var(--color-surface-container-lowest)' : 'transparent',
                color: selectedDeptId === g.departmentId ? 'var(--color-on-surface)' : 'var(--color-outline)',
                boxShadow: selectedDeptId === g.departmentId ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Receipt size={12} />
              {g.departmentName}
              <span className="ml-1 text-[10px] opacity-60">₦{g.totalAmount.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Summary card for selected department */}
      {selectedGroup && (
        <div className="p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-outline uppercase tracking-wide font-bold">{selectedGroup.departmentName}</p>
              <p className="text-2xl font-bold text-on-surface mt-1">₦{selectedGroup.totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-outline">Total Entries</p>
              <p className="text-lg font-semibold">{selectedGroup.count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<DepartmentExpenseEntry>
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: LIMIT,
            total,
            showSizeChanger: false,
            showTotal: (t: number) => `${t} expense${t !== 1 ? 's' : ''}`,
            onChange: (p) => setPage(p),
          }}
          onRow={(record) => ({
            onClick: () => openDetail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Create Drawer */}
      <Drawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Log Expense"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              htmlType="submit"
              form="create-expense-form"
              disabled={!createForm.departmentId || !createForm.expenseHead || !createForm.amount || !createForm.description || !createForm.fromDate || !createForm.toDate}
              loading={submitting}
            >
              Save Expense
            </Button>
          </div>
        }
      >
        <form id="create-expense-form" onSubmit={handleCreate} className="space-y-4 p-1">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
              Department <span className="text-error">*</span>
            </label>
            <Select
              value={createForm.departmentId}
              onChange={(val) => setCreateForm({ ...createForm, departmentId: val as string })}
              placeholder="Select department"
            >
              {departments.map((d) => (
                <Option key={d._id} value={d._id}>{d.name}</Option>
              ))}
            </Select>
          </div>

          <div className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest space-y-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1.5">
                Head Section / Category <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const first = activeRevenueHeads[0];
                    setCreateForm({
                      ...createForm,
                      headType: ExpenseHeadType.RevenueHead,
                      expenseHead: first?.name || '',
                      expenseHeadId: first?._id || '',
                    });
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border text-left cursor-pointer transition-all ${
                    createForm.headType === ExpenseHeadType.RevenueHead
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300'
                      : 'border-outline-variant text-outline bg-transparent'
                  }`}
                >
                  Revenue Head
                  <span className="block text-[9px] font-normal opacity-70">Direct sales costs</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const first = activeExpenditureHeads[0];
                    setCreateForm({
                      ...createForm,
                      headType: ExpenseHeadType.ExpenditureHead,
                      expenseHead: first?.name || '',
                      expenseHeadId: first?._id || '',
                    });
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border text-left cursor-pointer transition-all ${
                    createForm.headType === ExpenseHeadType.ExpenditureHead
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300'
                      : 'border-outline-variant text-outline bg-transparent'
                  }`}
                >
                  Expenditure Head
                  <span className="block text-[9px] font-normal opacity-70">Overhead / OPEX</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
                Expense Head Item <span className="text-error">*</span>
              </label>
              <Select
                value={createForm.expenseHead}
                onChange={(val) => {
                  const h = heads.find((x) => x.name === val);
                  setCreateForm({
                    ...createForm,
                    expenseHead: val as string,
                    expenseHeadId: h?._id || '',
                  });
                }}
                placeholder="Select expense head"
              >
                {availableHeadsForCreate.map((h) => (
                  <Option key={h._id} value={h.name}>{h.name}</Option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
              Amount (₦) <span className="text-error">*</span>
            </label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 50000"
              value={createForm.amount}
              onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
              Description <span className="text-error">*</span>
            </label>
            <Input
              placeholder="What is this expense for?"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
                From Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={createForm.fromDate}
                onChange={(e) => setCreateForm({ ...createForm, fromDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
                To Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={createForm.toDate}
                onChange={(e) => setCreateForm({ ...createForm, toDate: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditEntry(null); }}
        title="Edit Expense"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowEdit(false); setEditEntry(null); }}>
              Cancel
            </Button>
            <Button
              htmlType="submit"
              form="edit-expense-form"
              disabled={!editForm.expenseHead || !editForm.amount || !editForm.description || !editForm.fromDate || !editForm.toDate}
              loading={submitting}
            >
              Update Expense
            </Button>
          </div>
        }
      >
        <form id="edit-expense-form" onSubmit={handleEdit} className="space-y-4 p-1">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
              Department <span className="text-error">*</span>
            </label>
            <Select
              value={editForm.departmentId}
              onChange={(val) => setEditForm({ ...editForm, departmentId: val as string })}
              placeholder="Select department"
            >
              {departments.map((d) => (
                <Option key={d._id} value={d._id}>{d.name}</Option>
              ))}
            </Select>
          </div>

          <div className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest space-y-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1.5">
                Head Section / Category <span className="text-error">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const first = activeRevenueHeads[0];
                    setEditForm({
                      ...editForm,
                      headType: ExpenseHeadType.RevenueHead,
                      expenseHead: first?.name || '',
                      expenseHeadId: first?._id || '',
                    });
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border text-left cursor-pointer transition-all ${
                    editForm.headType === ExpenseHeadType.RevenueHead
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300'
                      : 'border-outline-variant text-outline bg-transparent'
                  }`}
                >
                  Revenue Head
                  <span className="block text-[9px] font-normal opacity-70">Direct sales costs</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const first = activeExpenditureHeads[0];
                    setEditForm({
                      ...editForm,
                      headType: ExpenseHeadType.ExpenditureHead,
                      expenseHead: first?.name || '',
                      expenseHeadId: first?._id || '',
                    });
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border text-left cursor-pointer transition-all ${
                    editForm.headType === ExpenseHeadType.ExpenditureHead
                      ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300'
                      : 'border-outline-variant text-outline bg-transparent'
                  }`}
                >
                  Expenditure Head
                  <span className="block text-[9px] font-normal opacity-70">Overhead / OPEX</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
                Expense Head Item <span className="text-error">*</span>
              </label>
              <Select
                value={editForm.expenseHead}
                onChange={(val) => {
                  const h = heads.find((x) => x.name === val);
                  setEditForm({
                    ...editForm,
                    expenseHead: val as string,
                    expenseHeadId: h?._id || '',
                  });
                }}
                placeholder="Select expense head"
              >
                {availableHeadsForEdit.map((h) => (
                  <Option key={h._id} value={h.name}>{h.name}</Option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
              Amount (₦) <span className="text-error">*</span>
            </label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 50000"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
              Description <span className="text-error">*</span>
            </label>
            <Input
              placeholder="What is this expense for?"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
                From Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={editForm.fromDate}
                onChange={(e) => setEditForm({ ...editForm, fromDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold block mb-1">
                To Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={editForm.toDate}
                onChange={(e) => setEditForm({ ...editForm, toDate: e.target.value })}
              />
            </div>
          </div>
        </form>
      </Drawer>

      <DetailDrawer entry={selectedEntry} open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedEntry(null); }} />

      {/* Printable Department Expenses Report Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Print Department Expenses Report"
        width={950}
      >
        <div className="py-2">
          <PrintableLetterhead
            title="DEPARTMENT OPERATIONAL EXPENSES REPORT"
            subtitle={
              selectedDeptId
                ? `Filtered by Department: ${groups.find((g) => g.departmentId === selectedDeptId)?.departmentName || 'Selected Department'}`
                : selectedExpenseHead
                ? `Filtered by Head: ${selectedExpenseHead}`
                : 'All Property Departments & Expense Heads'
            }
            metrics={[
              { label: 'Total Expenses Billed', value: `₦${items.reduce((s, e) => s + e.amount, 0).toLocaleString()}` },
              { label: 'Total Expense Entries', value: items.length },
              { label: 'Departments Billed', value: groups.length },
            ]}
            columns={[
              { title: 'Department', key: 'dept' },
              { title: 'Expense Head', key: 'head' },
              { title: 'Expense Description', key: 'desc' },
              { title: 'Billing Period', key: 'period' },
              { title: 'Logged By', key: 'user' },
              { title: 'Amount (₦)', key: 'amount', align: 'right' },
            ]}
            data={items.map((e) => ({
              dept: e.departmentId?.name || '—',
              head: e.expenseHead || '—',
              desc: e.description,
              period: `${format(new Date(e.fromDate), 'd MMM')} - ${format(new Date(e.toDate), 'd MMM yyyy')}`,
              user: e.loggedBy?.name || '—',
              amount: `₦${e.amount.toLocaleString()}`,
            }))}
            totalsRow={{
              dept: 'TOTAL DEPARTMENT EXPENSES',
              head: '—',
              desc: `Summary of ${items.length} Expense Entry Log(s)`,
              period: '—',
              user: '—',
              amount: `₦${items.reduce((s, e) => s + e.amount, 0).toLocaleString()}`,
            }}
            notes="Official Department Expenses Audit Log generated from City Den Apartments Operations System."
          />
        </div>
      </Modal>
    </div>
  );
}
