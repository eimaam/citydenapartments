import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Button, Input, Drawer, UserRole } from '@citydenapartments/shared';
import { Search, AlertTriangle, CheckCircle, XCircle, Clock, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../../contexts/auth';
import { useToast } from '../../../components/ui/Toast';
import { inventoryApi, type SpoilageReportResponse } from '../api/inventory.api';

const LIMIT = 20;

const statusStyles: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50' },
  approved: { label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  rejected: { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-50' },
};

export default function SpoilagePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canApprove = user ? [UserRole.SuperAdmin, UserRole.GroupGM].includes(user.role as any) : false;

  const [items, setItems] = useState<SpoilageReportResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [detail, setDetail] = useState<SpoilageReportResponse | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listSpoilage({ page, limit: LIMIT, status: statusFilter || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch { toast('error', 'Failed to load spoilage reports.'); }
    finally { setLoading(false); }
  }, [page, statusFilter, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(`approve-${id}`);
    try {
      await inventoryApi.approveSpoilage(id);
      toast('success', 'Write-off approved. Stock deducted.');
      fetchAll();
      if (detail?._id === id) setDetail(await inventoryApi.getSpoilage(id));
    } catch (e: any) { toast('error', e.message); }
    finally { setActionLoading(''); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(`reject-${id}`);
    try {
      await inventoryApi.rejectSpoilage(id);
      toast('success', 'Write-off rejected.');
      fetchAll();
      if (detail?._id === id) setDetail(await inventoryApi.getSpoilage(id));
    } catch (e: any) { toast('error', e.message); }
    finally { setActionLoading(''); }
  };

  const statusTabs = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: '' },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Audit</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Write-Offs & Spoilage</h1>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded bg-surface-container w-fit">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-sm transition-all cursor-pointer"
            style={{ background: statusFilter === tab.value ? 'var(--color-surface-container-lowest)' : 'transparent', color: statusFilter === tab.value ? 'var(--color-on-surface)' : 'var(--color-outline)' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {items.map((r) => {
          const st = statusStyles[r.status] || statusStyles.pending;
          return (
            <button key={r._id} onClick={() => setDetail(r)}
              className="w-full text-left p-4 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-high transition-all cursor-pointer">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${st.bg}`}>
                    {r.status === 'approved' ? <CheckCircle size={16} className={st.color} /> :
                     r.status === 'rejected' ? <XCircle size={16} className={st.color} /> :
                     <Clock size={16} className={st.color} />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{r.itemId?.name || 'Unknown'} <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${st.bg} ${st.color}`}>{st.label}</span></p>
                    <p className="text-xs text-outline">{r.spoilageType} · {r.quantity} {r.itemId?.unit} · Reported by {r.reportedBy?.name}</p>
                    <p className="text-xs text-outline">{format(new Date(r.reportedAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-outline flex-shrink-0">
                  <p className="font-medium">{r.reason}</p>
                </div>
              </div>
            </button>
          );
        })}
        {!loading && items.length === 0 && (
          <p className="text-center text-sm text-outline py-12">No reports found.</p>
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

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="Write-Off Report Details" width={520}>
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-lg">{detail.itemId?.name}</p>
              <span className={`text-xs px-2 py-1 rounded font-medium ${statusStyles[detail.status]?.bg} ${statusStyles[detail.status]?.color}`}>
                {statusStyles[detail.status]?.label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-outline">Quantity</p><p className="font-medium">{detail.quantity} {detail.itemId?.unit}</p></div>
              <div><p className="text-xs text-outline">Current Stock</p><p className="font-medium">{detail.itemId?.currentStock} {detail.itemId?.unit}</p></div>
              <div><p className="text-xs text-outline">Type</p><p className="font-medium capitalize">{detail.spoilageType}</p></div>
              <div><p className="text-xs text-outline">Category</p><p className="font-medium">{detail.itemId?.category}</p></div>
            </div>

            <div><p className="text-xs text-outline mb-1">Reason</p><p className="text-sm p-3 rounded bg-surface-container">{detail.reason}</p></div>
            {detail.notes && <div><p className="text-xs text-outline mb-1">Additional Notes</p><p className="text-sm p-3 rounded bg-surface-container">{detail.notes}</p></div>}

            <div className="border-t border-outline-variant/60 pt-4">
              <p className="text-xs font-bold uppercase text-outline mb-2">Timeline</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-outline">Reported by <strong>{detail.reportedBy?.name}</strong></span>
                  <span className="text-outline">{format(new Date(detail.reportedAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {detail.respondedAt && (
                  <div className="flex items-center gap-3 text-xs">
                    <div className={`w-2 h-2 rounded-full ${detail.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-outline">{detail.status === 'approved' ? 'Approved' : 'Rejected'} by <strong>{detail.respondedBy?.name}</strong></span>
                    <span className="text-outline">{format(new Date(detail.respondedAt), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                )}
              </div>
            </div>

            {detail.statusHistory && detail.statusHistory.length > 1 && (
              <div className="border-t border-outline-variant/60 pt-4">
                <p className="text-xs font-bold uppercase text-outline mb-2">Status History</p>
                <div className="space-y-1.5">
                  {detail.statusHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-outline">
                      <ArrowLeftRight size={10} />
                      <span>{h.fromStatus || '—'} → {h.toStatus}</span>
                      <span>by {h.changedBy?.name}</span>
                      <span>{format(new Date(h.changedAt), 'MMM d, h:mm a')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {canApprove && (
              <div className="flex gap-3 pt-2 border-t border-outline-variant/60">
                <Button size="sm" variant="destructive" loading={actionLoading === `reject-${detail._id}`}
                  onClick={() => handleReject(detail._id)} disabled={actionLoading.startsWith('approve')}>
                  <XCircle size={14} /> {detail.status === 'approved' ? 'Reverse (Reject)' : 'Reject'}
                </Button>
                <Button size="sm" loading={actionLoading === `approve-${detail._id}`}
                  onClick={() => handleApprove(detail._id)} disabled={actionLoading.startsWith('reject')}>
                  <CheckCircle size={14} /> {detail.status === 'rejected' ? 'Re-approve' : 'Approve'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
