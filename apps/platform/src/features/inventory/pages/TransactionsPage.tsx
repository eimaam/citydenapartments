import { useState, useEffect, useCallback } from 'react';
import { Search, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { Input, Select, Option, Badge, RoomStatus } from '@citydenapartments/shared';
import { inventoryApi, type InventoryTransaction } from '../api/inventory.api';
import { inventoryApi as api } from '../api/inventory.api';

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
      const res = await api.listTransactions({ page, limit: LIMIT, type: typeFilter || undefined, from: from || undefined, to: to || undefined });
      setTxns(res.items);
      setTotal(res.total);
    } catch { toast('error', 'Failed to load transactions.'); }
    finally { setLoading(false); }
  }, [page, typeFilter, from, to, toast]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);
  useEffect(() => { setPage(1); }, [typeFilter, from, to]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Store</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Transactions</h1>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container">
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Item</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Type</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Qty</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Before</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">After</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Requested By</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Date</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((tx) => (
              <tr key={tx._id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container/50">
                <td className="px-4 py-3">
                  <p className="font-medium text-on-surface">{tx.itemId?.name || 'Unknown'}</p>
                  <p className="text-[10px] text-outline">{tx.itemId?.category}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {tx.type === 'restock' ? <ArrowUpCircle size={12} className="text-emerald-500" /> : <ArrowDownCircle size={12} className="text-amber-500" />}
                    <span className="text-xs capitalize">{tx.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium">
                  <span className={tx.type === 'restock' ? 'text-emerald-600' : 'text-red-500'}>
                    {tx.type === 'restock' ? '+' : ''}{tx.quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-outline">{tx.previousStock}</td>
                <td className="px-4 py-3 text-right font-mono text-outline">{tx.newStock}</td>
                <td className="px-4 py-3 text-xs">{tx.requestedBy || tx.department || '-'}</td>
                <td className="px-4 py-3 text-xs text-outline">{format(new Date(tx.createdAt), 'd MMM, HH:mm')}</td>
              </tr>
            ))}
            {!loading && txns.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-outline py-12">No transactions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
  );
}
