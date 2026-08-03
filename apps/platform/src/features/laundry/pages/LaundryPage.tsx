import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Shirt, Plus } from 'lucide-react';
import { Button, Input, Table, Pagination, Badge } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import type { LaundryBillResponse, LaundryStatusType } from '@citydenapartments/shared';
import { useToast } from '../../../components/ui/Toast';
import { laundryApi } from '../api/laundry.api';
import NewLaundryBill from '../components/NewLaundryBill';
import BillDetailDrawer from '../components/BillDetailDrawer';

const LIMIT = 15;

const statusFilterOptions = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
];

const statusColorMap: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface Paginated {
  items: LaundryBillResponse[];
  total: number;
  page: number;
  limit: number;
}

export default function LaundryPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'new' | 'bills'>('new');

  const [data, setData] = useState<Paginated>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [detail, setDetail] = useState<LaundryBillResponse | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await laundryApi.bills({ page, limit: LIMIT, status: status || undefined, search: search || undefined });
      setData(res);
    } catch {
      toast('error', 'Failed to load laundry bills.');
    } finally {
      setLoading(false);
    }
  }, [page, status, search, toast]);

  useEffect(() => {
    if (tab === 'bills') fetchBills();
  }, [tab, fetchBills]);

  useEffect(() => { setPage(1); }, [status, search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const handleCreated = useCallback(() => {
    setTab('bills');
    fetchBills();
  }, [fetchBills]);

  const toggleStatus = async (id: string, next: LaundryStatusType) => {
    setStatusBusy(true);
    try {
      const updated = await laundryApi.updateStatus(id, next);
      setDetail(updated);
      toast('success', `Bill ${next === 'paid' ? 'marked as paid' : 'marked as pending'}.`);
      fetchBills();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to update status.');
    } finally {
      setStatusBusy(false);
    }
  };

  const openDetail = async (bill: LaundryBillResponse) => {
    setDetail(bill);
    try {
      const fresh = await laundryApi.getBill(bill._id);
      setDetail(fresh);
    } catch {
      toast('error', 'Failed to load bill details.');
    }
  };

  const columns: TableProps<LaundryBillResponse>['columns'] = [
    { title: 'Bill No.', dataIndex: 'billNumber', key: 'num', width: 140, render: (_: unknown, b: LaundryBillResponse) => <span className="font-mono text-xs">{b.billNumber}</span> },
    {
      title: 'Guest', key: 'guest',
      render: (_: unknown, b: LaundryBillResponse) => (
        <div>
          <p className="font-medium">{b.customer?.name ?? b.walkIn?.name}</p>
          <p className="text-xs opacity-60">{b.customer?.phone ?? b.walkIn?.phone ?? '—'}</p>
        </div>
      ),
    },
    { title: 'Room', dataIndex: 'roomNumber', key: 'room', width: 80, render: (_: unknown, b: LaundryBillResponse) => b.roomNumber || '—' },
    {
      title: 'Items', key: 'items', width: 150,
      render: (_: unknown, b: LaundryBillResponse) => (
        <span className="text-xs">{b.lines.length} item(s)</span>
      ),
    },
    {
      title: 'Date', key: 'date', width: 120, responsive: ['md' as const],
      render: (_: unknown, b: LaundryBillResponse) => <span className="text-xs">{format(new Date(b.createdAt), 'dd MMM yyyy')}</span>,
    },
    {
      title: 'Total', dataIndex: 'total', key: 'total', width: 110, align: 'right' as const,
      render: (_: unknown, b: LaundryBillResponse) => <span className="font-medium">₦{b.total.toLocaleString()}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 100,
      render: (_: unknown, b: LaundryBillResponse) => <Badge status={b.status} label={b.status === 'paid' ? 'Paid' : 'Pending'} colorMap={statusColorMap} />,
    },
  ];

  const paginationInfo = useMemo(() => ({
    currentPage: data.page,
    totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    totalItems: data.total,
    itemsPerPage: data.limit,
    hasNextPage: data.page * data.limit < data.total,
    hasPrevPage: data.page > 1,
  }), [data]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Laundry</span></div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Laundry &amp; Pressing</h1>
          <p className="text-sm text-on-surface-variant">Create laundry bills for guests, track payments and print receipts.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'new' ? 'default' : 'outline'} icon={<Plus size={14} />} onClick={() => setTab('new')}>New Bill</Button>
        <Button variant={tab === 'bills' ? 'default' : 'outline'} icon={<Shirt size={14} />} onClick={() => setTab('bills')}>Bills</Button>
      </div>

      {tab === 'new' ? (
        <NewLaundryBill onCreated={handleCreated} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2">
              {statusFilterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={status === opt.value ? 'default' : 'outline'}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <Input
              className="sm:max-w-xs"
              placeholder="Search name, phone, room, bill no…"
              value={searchInput}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <Table<LaundryBillResponse>
            columns={columns}
            dataSource={data.items}
            rowKey="_id"
            loading={loading}
            onRow={(record) => ({ onClick: () => openDetail(record), className: 'cursor-pointer' })}
          />

          {data.total > 0 && (
            <Pagination pagination={paginationInfo} onPageChange={setPage} isLoading={loading} itemNoun="bills" />
          )}
        </div>
      )}

      <BillDetailDrawer bill={detail} onClose={() => setDetail(null)} onToggleStatus={toggleStatus} busy={statusBusy} />
    </div>
  );
}
