import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { Input, Select, Option, Table, Badge, RoomStatus } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { inventoryApi, type InventoryTransaction } from '../api/inventory.api';

const LIMIT = 20;

export default function TransactionsPage() {
  const { toast } = useToast();
  const [txns, setTxns] = useState<InventoryTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listTransactions({ page, limit: LIMIT, type: typeFilter || undefined, from: from || undefined, to: to || undefined });
      setTxns(res.items);
      setTotal(res.total);
    } catch { toast('error', 'Failed to load transactions.'); }
    finally { setLoading(false); }
  }, [page, typeFilter, from, to, toast]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);
  useEffect(() => { setPage(1); }, [typeFilter, from, to]);

  const columns: TableProps<InventoryTransaction>['columns'] = [
    { title: 'Item', key: 'item', render: (_: unknown, r: InventoryTransaction) => (
      <div><p className="font-medium">{r.itemId?.name || 'Unknown'}</p><p className="text-xs text-outline">{r.itemId?.category}</p></div>
    )},
    { title: 'Type', dataIndex: 'type', key: 'type', width: 100,
      render: (v: string) => (
        <div className="flex items-center gap-1.5">
          {v === 'restock' ? <ArrowUpCircle size={12} className="text-emerald-500" /> : <ArrowDownCircle size={12} className="text-amber-500" />}
          <span className="text-xs capitalize">{v}</span>
        </div>
      )},
    { title: 'Qty', dataIndex: 'quantity', key: 'qty', width: 80, align: 'right' as const,
      render: (v: number, r: InventoryTransaction) => (
        <span className={`font-mono font-medium ${r.type === 'restock' ? 'text-emerald-600' : 'text-red-500'}`}>
          {r.type === 'restock' ? '+' : ''}{v}
        </span>
      )},
    { title: 'Before', dataIndex: 'previousStock', key: 'before', width: 80, align: 'right' as const,
      render: (v: number) => <span className="font-mono text-outline">{v}</span> },
    { title: 'After', dataIndex: 'newStock', key: 'after', width: 80, align: 'right' as const,
      render: (v: number) => <span className="font-mono text-outline">{v}</span> },
    { title: 'Requested By', key: 'requested', width: 150,
      render: (_: unknown, r: InventoryTransaction) => <span className="text-xs">{r.requestedBy || r.department || '-'}</span> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', width: 150,
      render: (v: string) => <span className="text-xs text-outline">{format(new Date(v), 'd MMM yyyy, HH:mm')}</span> },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.1em] uppercase text-outline">Store</span></div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Inventory Transactions</h1>
        <div className="flex items-center gap-3">
          <Select size="sm" className="!w-32" value={typeFilter} onChange={(v) => setTypeFilter(v)}>
            <Option value="">All Types</Option>
            <Option value="restock">Restock</Option>
            <Option value="issue">Issue</Option>
          </Select>
          <Input size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-36" />
          <Input size="sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-36" />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<InventoryTransaction>
          columns={columns}
          dataSource={txns}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page, pageSize: LIMIT, total,
            showSizeChanger: true,
            onChange: (p) => setPage(p),
          }}
        />
      </div>
    </div>
  );
}
