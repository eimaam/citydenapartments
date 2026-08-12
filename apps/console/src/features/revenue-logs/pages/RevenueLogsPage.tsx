import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/auth';
import { can } from '../../../components/ui/Can';
import { UserRole } from '@citydenapartments/shared';
import { Button, Input, Select, Option, Drawer, Table, MetricCard, Modal, PrintableLetterhead } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { revenueLogsApi } from '../api/revenue-logs.api';
import { departmentsApi } from '../../departments/api/departments.api';
import type { RevenueLogResponse, RevenueLogSummaryResponse } from '@citydenapartments/shared';
import { DollarSign, Plus, Filter, Building2, Banknote, CreditCard, Landmark, Printer } from 'lucide-react';

export default function RevenueLogsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const canCreate = can(user, [UserRole.Accountant, UserRole.SuperAdmin, UserRole.GroupGM]);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Data
  const [items, setItems] = useState<RevenueLogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<RevenueLogSummaryResponse | null>(null);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);

  // Modal / Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    departmentId: '',
    revenueDate: format(new Date(), 'yyyy-MM-dd'),
    cashAmount: '',
    posAmount: '',
    transferAmount: '',
    otherAmount: '',
    notes: '',
  });

  const loadDepartments = useCallback(async () => {
    if (!user?.activeBranchId) return;
    try {
      const res = await departmentsApi.list(user.activeBranchId);
      setDepartments(Array.isArray(res) ? res : []);
    } catch {
      // quiet catch
    }
  }, [user?.activeBranchId]);

  const loadData = useCallback(async () => {
    if (!user?.activeBranchId) return;
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        revenueLogsApi.list({
          departmentId: selectedDeptId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
          limit: 20,
        }),
        revenueLogsApi.summary({
          departmentId: selectedDeptId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
      ]);
      setItems(listRes.items);
      setTotal(listRes.total);
      setSummaryData(summaryRes);
    } catch (err: any) {
      toast('error', err.message || 'Error loading revenue logs');
    } finally {
      setLoading(false);
    }
  }, [user?.activeBranchId, selectedDeptId, fromDate, toDate, page, toast]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Auto-Calculation of Total Revenue
  const cashNum = parseFloat(form.cashAmount) || 0;
  const posNum = parseFloat(form.posAmount) || 0;
  const transferNum = parseFloat(form.transferAmount) || 0;
  const otherNum = parseFloat(form.otherAmount) || 0;
  const computedTotal = cashNum + posNum + transferNum + otherNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departmentId) {
      toast('error', 'Please select a department.');
      return;
    }
    if (!form.revenueDate) {
      toast('error', 'Please select the date for this revenue.');
      return;
    }
    if (computedTotal <= 0) {
      toast('error', 'Total revenue must be greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      await revenueLogsApi.create({
        departmentId: form.departmentId,
        revenueDate: form.revenueDate,
        cashAmount: cashNum,
        posAmount: posNum,
        transferAmount: transferNum,
        otherAmount: otherNum,
        notes: form.notes || undefined,
      });

      toast('success', `₦${computedTotal.toLocaleString()} logged for ${form.revenueDate}`);
      setShowDrawer(false);
      setForm({
        departmentId: '',
        revenueDate: format(new Date(), 'yyyy-MM-dd'),
        cashAmount: '',
        posAmount: '',
        transferAmount: '',
        otherAmount: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      toast('error', err.message || 'Failed to log revenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Revenue Date',
      dataIndex: 'revenueDate',
      key: 'revenueDate',
      render: (val: any) => (
        <span className="font-semibold text-on-surface">
          {val ? format(new Date(val), 'dd MMM yyyy') : '-'}
        </span>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'departmentId',
      key: 'departmentId',
      render: (val: any) => {
        const name = typeof val === 'object' ? val?.name : val;
        return (
          <span className="inline-flex items-center gap-1.5 font-bold text-on-surface">
            <Building2 size={14} className="text-primary" />
            {name || 'General'}
          </span>
        );
      },
    },
    {
      title: 'Cash',
      dataIndex: 'cashAmount',
      key: 'cashAmount',
      render: (val: number) => <span className="font-mono">₦{(val || 0).toLocaleString()}</span>,
    },
    {
      title: 'POS',
      dataIndex: 'posAmount',
      key: 'posAmount',
      render: (val: number) => <span className="font-mono">₦{(val || 0).toLocaleString()}</span>,
    },
    {
      title: 'Bank Transfer',
      dataIndex: 'transferAmount',
      key: 'transferAmount',
      render: (val: number) => <span className="font-mono">₦{(val || 0).toLocaleString()}</span>,
    },
    {
      title: 'Other',
      dataIndex: 'otherAmount',
      key: 'otherAmount',
      render: (val: number) => <span className="font-mono text-outline">₦{(val || 0).toLocaleString()}</span>,
    },
    {
      title: 'Total Revenue',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => (
        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
          ₦{(val || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Logged By',
      dataIndex: 'loggedBy',
      key: 'loggedBy',
      render: (val: any) => {
        const name = typeof val === 'object' ? val?.name : val;
        return <span className="text-xs text-on-surface-variant">{name || 'Staff'}</span>;
      },
    },
    {
      title: 'Logged At',
      dataIndex: 'loggedAt',
      key: 'loggedAt',
      render: (val: any) => (
        <span className="text-xs text-outline">
          {val ? format(new Date(val), 'dd MMM yyyy, HH:mm') : '-'}
        </span>
      ),
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (val: string) => <span className="text-xs text-outline italic truncate max-w-[150px] inline-block">{val || '-'}</span>,
    },
  ];

  const handleOpenDrawer = () => {
    if (selectedDeptId) {
      setForm((prev) => ({ ...prev, departmentId: selectedDeptId }));
    }
    setShowDrawer(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Revenue Logging</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Log and audit external department revenues (Bar, Laundry, Restaurant, Gym) by payment breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setShowPrintModal(true)} className="gap-2">
            <Printer size={16} /> Print Revenue Report
          </Button>
          {canCreate && (
            <Button onClick={handleOpenDrawer} className="gap-2">
              <Plus size={16} /> Log Department Revenue
            </Button>
          )}
        </div>
      </div>

      {/* Date & Department Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-3.5 rounded-lg border border-outline-variant shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-outline uppercase tracking-wider">
          <Filter size={14} /> Filters:
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant">From:</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="w-36 text-xs h-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-on-surface-variant">To:</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="w-36 text-xs h-8"
          />
        </div>
        <div className="w-48">
          <Select
            value={selectedDeptId}
            onChange={(val) => { setSelectedDeptId(val as string); setPage(1); }}
          >
            <Option value="">All Departments</Option>
            {departments.map((d) => (
              <Option key={d._id} value={d._id}>{d.name}</Option>
            ))}
          </Select>
        </div>
        {(fromDate || toDate || selectedDeptId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFromDate(''); setToDate(''); setSelectedDeptId(''); setPage(1); }}
            className="text-xs text-outline"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Overall Summary Metrics */}
      {summaryData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Logged Revenue"
            value={`₦${summaryData.overall.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="#10b981"
          />
          <MetricCard
            label="Total Cash"
            value={`₦${summaryData.overall.totalCash.toLocaleString()}`}
            icon={Banknote}
            color="#3b82f6"
          />
          <MetricCard
            label="Total POS Cards"
            value={`₦${summaryData.overall.totalPos.toLocaleString()}`}
            icon={CreditCard}
            color="#8b5cf6"
          />
          <MetricCard
            label="Total Bank Transfer"
            value={`₦${summaryData.overall.totalTransfer.toLocaleString()}`}
            icon={Landmark}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Department Summary Cards Grid */}
      {summaryData && summaryData.departmentCards.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-outline">
            Department Revenue Cards ({summaryData.departmentCards.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {summaryData.departmentCards.map((dept) => (
              <div
                key={dept.departmentId}
                className="p-4 rounded-xl border border-outline-variant bg-surface hover:border-primary/50 transition-colors shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-outline-variant pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-primary" />
                    <span className="font-extrabold text-sm text-on-surface">{dept.departmentName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                    {dept.logCount} Log{dept.logCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-outline tracking-wider">Total Revenue</p>
                  <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ₦{dept.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-outline-variant/60 text-[11px]">
                  <div>
                    <span className="text-outline text-[9px] block">Cash</span>
                    <span className="font-mono font-bold text-on-surface">₦{dept.cashAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[9px] block">POS</span>
                    <span className="font-mono font-bold text-on-surface">₦{dept.posAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[9px] block">Transfer</span>
                    <span className="font-mono font-bold text-on-surface">₦{dept.transferAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Logs Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden p-4 space-y-4">
        <h2 className="text-sm font-extrabold text-on-surface tracking-wide">Revenue Audit History</h2>
        <Table<RevenueLogResponse>
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* Create Log Drawer */}
      <Drawer
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title="Log Department Revenue"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowDrawer(false)}>
              Cancel
            </Button>
            <Button
              htmlType="submit"
              form="create-revenue-form"
              loading={submitting}
              disabled={!form.departmentId || computedTotal <= 0}
            >
              Log Revenue
            </Button>
          </div>
        }
      >
        <form id="create-revenue-form" onSubmit={handleSubmit} className="space-y-4 p-2">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Department *</label>
            <Select
              value={form.departmentId}
              onChange={(val) => setForm({ ...form, departmentId: val as string })}
            >
              <Option value="">Select Department...</Option>
              {departments.map((d) => (
                <Option key={d._id} value={d._id}>{d.name}</Option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Revenue Date *</label>
            <Input
              type="date"
              value={form.revenueDate}
              onChange={(e) => setForm({ ...form, revenueDate: e.target.value })}
            />
            <p className="text-[11px] text-outline mt-1">The business date this revenue was earned for.</p>
          </div>

          <div className="p-3.5 rounded-lg border border-outline-variant bg-surface-container-lowest space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-outline block">
              Payment Breakdown (₦)
            </span>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Cash Amount (₦)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.cashAmount}
                onChange={(e) => setForm({ ...form, cashAmount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">POS Card Amount (₦)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.posAmount}
                onChange={(e) => setForm({ ...form, posAmount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Bank Transfer Amount (₦)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.transferAmount}
                onChange={(e) => setForm({ ...form, transferAmount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Other Payment Amount (₦)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.otherAmount}
                onChange={(e) => setForm({ ...form, otherAmount: e.target.value })}
              />
            </div>

            {/* Computed Total Preview Card */}
            <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">Auto-Calculated Total:</span>
              <span className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                ₦{computedTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">Notes / Ref Details (Optional)</label>
            <Input
              placeholder="e.g. Sales summary verified from Bar Supervisor John"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </Drawer>

      {/* Printable Revenue Overview Report Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Revenue Overview Report"
        width={950}
      >
        <div className="py-2">
          <PrintableLetterhead
            title="REVENUE OVERVIEW REPORT"
            subtitle={
              selectedDeptId
                ? `Department: ${departments.find((d) => d._id === selectedDeptId)?.name || 'Filtered Department'}`
                : 'All External Department Revenues Audit'
            }
            date={fromDate && toDate ? `${fromDate} to ${toDate}` : fromDate ? `From ${fromDate}` : undefined}
            metrics={
              summaryData
                ? [
                    { label: 'Total Revenue', value: `₦${summaryData.overall.totalRevenue.toLocaleString()}` },
                    { label: 'Total Cash', value: `₦${summaryData.overall.totalCash.toLocaleString()}` },
                    { label: 'Total POS Cards', value: `₦${summaryData.overall.totalPos.toLocaleString()}` },
                    { label: 'Total Bank Transfers', value: `₦${summaryData.overall.totalTransfer.toLocaleString()}` },
                  ]
                : []
            }
            columns={[
              {
                title: 'Revenue Date',
                key: 'revenueDate',
                render: (val) => (val ? format(new Date(val), 'dd MMM yyyy') : '-'),
              },
              {
                title: 'Department',
                key: 'departmentId',
                render: (val) => (typeof val === 'object' ? val?.name : val || 'N/A'),
              },
              {
                title: 'Cash (₦)',
                key: 'cashAmount',
                align: 'right',
                render: (val) => (val ? `₦${Number(val).toLocaleString()}` : '₦0'),
              },
              {
                title: 'POS (₦)',
                key: 'posAmount',
                align: 'right',
                render: (val) => (val ? `₦${Number(val).toLocaleString()}` : '₦0'),
              },
              {
                title: 'Transfer (₦)',
                key: 'transferAmount',
                align: 'right',
                render: (val) => (val ? `₦${Number(val).toLocaleString()}` : '₦0'),
              },
              {
                title: 'Other (₦)',
                key: 'otherAmount',
                align: 'right',
                render: (val) => (val ? `₦${Number(val).toLocaleString()}` : '₦0'),
              },
              {
                title: 'Total (₦)',
                key: 'totalAmount',
                align: 'right',
                render: (val) => (val ? `₦${Number(val).toLocaleString()}` : '₦0'),
              },
            ]}
            data={items}
            totalsRow={
              summaryData
                ? {
                    departmentId: 'GRAND TOTAL',
                    cashAmount: `₦${summaryData.overall.totalCash.toLocaleString()}`,
                    posAmount: `₦${summaryData.overall.totalPos.toLocaleString()}`,
                    transferAmount: `₦${summaryData.overall.totalTransfer.toLocaleString()}`,
                    otherAmount: `₦${summaryData.overall.totalOther.toLocaleString()}`,
                    totalAmount: `₦${summaryData.overall.totalRevenue.toLocaleString()}`,
                  }
                : undefined
            }
            notes="Logged revenue metrics verified by Finance/Accounts department. Generated from City Den Apartments Operations Portal."
          />
        </div>
      </Modal>
    </div>
  );
}
