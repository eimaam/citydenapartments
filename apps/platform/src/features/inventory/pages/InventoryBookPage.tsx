import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Input, Select, Option } from '@citydenapartments/shared';
import { Search, BookOpen } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { inventoryApi, type DailySnapshotResponse } from '../api/inventory.api';

const LIMIT = 30;

export default function InventoryBookPage() {
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<DailySnapshotResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listSnapshots({
        page, limit: LIMIT,
        from: from || undefined,
        to: to || undefined,
      });
      setSnapshots(res.items);
      setTotal(res.total);
    } catch { toast('error', 'Failed to load inventory book.'); }
    finally { setLoading(false); }
  }, [page, from, to, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [from, to]);

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Book</span></div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Inventory Ledger</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-outline uppercase">From</span>
            <Input size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-36" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-outline uppercase">To</span>
            <Input size="sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-36" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container">
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">Date</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">Item</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">Opening</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">+ Restock</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">− Issue</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">− Spoilage</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">± Adj.</th>
              <th className="text-right px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">Closing</th>
              <th className="text-center px-4 py-3 text-[10px] font-bold uppercase text-outline tracking-wider">Auto</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => {
              const item = s.itemId as { _id: string; name: string; category: string; unit: string } | undefined;
              const expected =
                s.openingStock + s.totalRestocks - s.totalIssues - s.totalSpoilage + s.totalAdjustments;
              const balanced = expected === s.closingStock;
              return (
                <tr key={s._id} className="border-b border-outline-variant/30 hover:bg-surface-container/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-xs">{format(new Date(s.date + 'T00:00:00'), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{item?.name || s.itemId as string}</p>
                    <p className="text-[10px] text-outline">{item?.category} · {item?.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{s.openingStock}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-emerald-600">{s.totalRestocks > 0 ? `+${s.totalRestocks}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-red-600">{s.totalIssues > 0 ? `−${s.totalIssues}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-red-500">{s.totalSpoilage > 0 ? `−${s.totalSpoilage}` : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-amber-600">{s.totalAdjustments !== 0 ? (s.totalAdjustments > 0 ? `+${s.totalAdjustments}` : s.totalAdjustments) : '—'}</td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-bold ${balanced ? '' : 'text-red-500'}`}>{s.closingStock}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.autoClosed ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                      {s.autoClosed ? 'Auto' : 'Manual'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && snapshots.length === 0 && (
          <p className="text-center text-sm text-outline py-12">No ledger entries found. The daily close cron runs at midnight.</p>
        )}
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
