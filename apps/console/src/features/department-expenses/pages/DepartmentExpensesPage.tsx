import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Eye, Receipt, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { Input, Select, Option, Drawer, Button, Table, Badge } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { UserRole } from '@citydenapartments/shared';
import { departmentsApi } from '../../departments/api/departments.api';
import { expensesApi, type DepartmentExpenseEntry, type ExpenseGroup } from '../api/department-expenses.api';

const LIMIT = 25;

function DetailDrawer({ entry, open, onClose }: { entry: DepartmentExpenseEntry | null; open: boolean; onClose: () => void }) {
  if (!entry) return null;

  return (
    <Drawer open={open} onClose={onClose} title="Expense Detail" size="md">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Department</p>
            <p className="text-sm font-medium">{entry.departmentId?.name || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Amount</p>
            <p className="text-lg font-bold text-on-surface">₦{entry.amount.toLocaleString()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Description</p>
            <p className="text-sm">{entry.description}</p>
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
  const [selectedEntry, setSelectedEntry] = useState<DepartmentExpenseEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ departmentId: '', amount: '', description: '', fromDate: '', toDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);

  const [editEntry, setEditEntry] = useState<DepartmentExpenseEntry | null>(null);
  const [editForm, setEditForm] = useState({ departmentId: '', amount: '', description: '', fromDate: '', toDate: '' });
  const [showEdit, setShowEdit] = useState(false);

  const canWrite = user ? [UserRole.Accountant, UserRole.SuperAdmin, UserRole.GroupGM].includes(user.role) : false;

  useEffect(() => {
    if (!user?.activeBranchId) return;
    departmentsApi.list(user.activeBranchId).then((res) => {
      const depts = Array.isArray(res) ? res : (res as any).items || [];
      setDepartments(depts);
    }).catch(() => {});
  }, [user?.activeBranchId]);

  useEffect(() => {
    expensesApi.getGroups()
      .then(setGroups)
      .catch(() => {});
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expensesApi.list({ departmentId: selectedDeptId || undefined, page, limit: LIMIT });
      setItems(res.items);
      setTotal(res.total);
    } catch { toast('error', 'Failed to load expenses.'); }
    finally { setLoading(false); }
  }, [selectedDeptId, page, toast]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { setPage(1); }, [selectedDeptId]);

  const openDetail = (entry: DepartmentExpenseEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.departmentId || !createForm.amount || !createForm.description || !createForm.fromDate || !createForm.toDate) {
      toast('error', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await expensesApi.create({
        departmentId: createForm.departmentId,
        amount: Number(createForm.amount),
        description: createForm.description,
        fromDate: createForm.fromDate,
        toDate: createForm.toDate,
      });
      toast('success', 'Expense logged successfully.');
      setShowCreate(false);
      setCreateForm({ departmentId: '', amount: '', description: '', fromDate: '', toDate: '' });
      fetchExpenses();
      const updated = await expensesApi.getGroups();
      setGroups(updated);
    } catch { toast('error', 'Failed to log expense.'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (entry: DepartmentExpenseEntry) => {
    setEditEntry(entry);
    setEditForm({
      departmentId: entry.departmentId?._id || '',
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
        amount: Number(editForm.amount),
        description: editForm.description,
        fromDate: editForm.fromDate,
        toDate: editForm.toDate,
      });
      toast('success', 'Expense updated successfully.');
      setShowEdit(false);
      setEditEntry(null);
      fetchExpenses();
    } catch { toast('error', 'Failed to update expense.'); }
    finally { setSubmitting(false); }
  };

  const selectedGroup = groups.find((g) => g.departmentId === selectedDeptId);

  const columns: TableProps<DepartmentExpenseEntry>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'fromDate',
      key: 'fromDate',
      width: 130,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="text-xs font-mono">{format(new Date(r.fromDate), 'd MMM yyyy')}</span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="font-mono font-medium">₦{r.amount.toLocaleString()}</span>
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
      width: 150,
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
      width: 130,
      render: (_: unknown, r: DepartmentExpenseEntry) => (
        <span className="text-sm">{r.loggedBy?.name || '—'}</span>
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
              className="p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer bg-transparent border-none transition-colors text-xs"
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
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Finance</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Receipt size={22} className="text-outline" />
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Department Expenses</h1>
        </div>
        {canWrite && (
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>
            Log Expense
          </Button>
        )}
      </div>

      {/* Department tabs */}
      {groups.length > 0 && (
        <div className="flex gap-1 mb-6 p-1 rounded bg-surface-container w-full overflow-x-auto">
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
        <div className="mb-6 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
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
      <Drawer open={showCreate} onClose={() => setShowCreate(false)} title="Log Expense" size="md"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button htmlType="submit" form="create-expense-form" disabled={!createForm.departmentId || !createForm.amount || !createForm.description || !createForm.fromDate || !createForm.toDate} loading={submitting}>Save</Button></div>}>
        <form id="create-expense-form" onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold">Department<span className="text-error ml-0.5">*</span></label>
            <Select value={createForm.departmentId} onChange={(val) => setCreateForm({ ...createForm, departmentId: val as string })} placeholder="Select department">
              {departments.map((d) => (
                <Option key={d._id} value={d._id}>{d.name}</Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold">Amount (₦)<span className="text-error ml-0.5">*</span></label>
            <Input type="number" min={0} placeholder="e.g. 50000" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold">Description<span className="text-error ml-0.5">*</span></label>
            <Input placeholder="What is this expense for?" value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold">From Date<span className="text-error ml-0.5">*</span></label>
              <Input type="date" value={createForm.fromDate} onChange={(e) => setCreateForm({ ...createForm, fromDate: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold">To Date<span className="text-error ml-0.5">*</span></label>
              <Input type="date" value={createForm.toDate} onChange={(e) => setCreateForm({ ...createForm, toDate: e.target.value })} />
            </div>
          </div>
        </form>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={showEdit} onClose={() => { setShowEdit(false); setEditEntry(null); }} title="Edit Expense" size="md"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => { setShowEdit(false); setEditEntry(null); }}>Cancel</Button><Button htmlType="submit" form="edit-expense-form" disabled={!editForm.amount || !editForm.description || !editForm.fromDate || !editForm.toDate} loading={submitting}>Update</Button></div>}>
        <form id="edit-expense-form" onSubmit={handleEdit} className="space-y-5">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold">Amount (₦)<span className="text-error ml-0.5">*</span></label>
            <Input type="number" min={0} placeholder="e.g. 50000" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wide font-bold">Description<span className="text-error ml-0.5">*</span></label>
            <Input placeholder="What is this expense for?" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold">From Date<span className="text-error ml-0.5">*</span></label>
              <Input type="date" value={editForm.fromDate} onChange={(e) => setEditForm({ ...editForm, fromDate: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wide font-bold">To Date<span className="text-error ml-0.5">*</span></label>
              <Input type="date" value={editForm.toDate} onChange={(e) => setEditForm({ ...editForm, toDate: e.target.value })} />
            </div>
          </div>
        </form>
      </Drawer>

      <DetailDrawer entry={selectedEntry} open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedEntry(null); }} />
    </div>
  );
}
