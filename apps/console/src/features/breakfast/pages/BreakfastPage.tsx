import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { Coffee, Check, Calendar, Users, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@citydenapartments/shared';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { breakfastApi, type ManifestEntry } from '../api/breakfast.api';

export default function BreakfastPage() {
  const { toast } = useToast();
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [serving, setServing] = useState<Record<string, boolean>>({});
  const [resetting, setResetting] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const fetchManifest = useCallback(async () => {
    setLoading(true);
    try { setManifest(await breakfastApi.manifest(date)); }
    catch { toast('error', 'Failed to load breakfast manifest.'); }
    finally { setLoading(false); }
  }, [date, toast]);

  useEffect(() => { fetchManifest(); }, [fetchManifest]);

  const handleServe = async (entry: ManifestEntry) => {
    setServing((prev) => ({ ...prev, [entry.bookingId]: true }));
    try {
      await breakfastApi.serve({ bookingId: entry.bookingId, roomId: entry.roomId, guestName: entry.guestName, dateServed: date });
      toast('success', `${entry.guestName} served.`);
      await fetchManifest();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to record serving.');
    } finally { setServing((prev) => ({ ...prev, [entry.bookingId]: false })); }
  };

  const handleReset = async (entry: ManifestEntry) => {
    setResetting((prev) => ({ ...prev, [entry.bookingId]: true }));
    try {
      await breakfastApi.reset(entry.bookingId);
      toast('success', `${entry.guestName} reset to pending.`);
      await fetchManifest();
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Failed to reset breakfast.');
    } finally { setResetting((prev) => ({ ...prev, [entry.bookingId]: false })); }
  };

  const served = manifest.filter((e) => e.breakfastStatus === 'served').length;
  const expired = manifest.filter((e) => e.breakfastStatus === 'expired').length;
  const pending = manifest.filter((e) => e.breakfastStatus === 'pending').length;

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Kitchen</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Breakfast</h1>
          <p className="text-sm text-on-surface-variant mt-1">Daily meal manifest — mark guests as served.</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-outline" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-9 px-3 text-xs rounded border border-outline-variant bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Guests', value: manifest.length, icon: Users, color: '#3b82f6' },
          { label: 'Served', value: served, icon: Coffee, color: '#10b981' },
          { label: 'Expired', value: expired, icon: XCircle, color: '#ef4444' },
          { label: 'Pending', value: pending, icon: Coffee, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center gap-2 mb-1"><Icon size={14} style={{ color }} /><span className="text-xs text-outline">{label}</span></div>
            <p className="text-2xl font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size={20} className="text-primary" /></div>
      ) : manifest.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <Coffee size={32} className="mx-auto mb-3 text-outline" /><p className="text-sm text-on-surface-variant">No breakfast data for this date.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-outline-variant">
              <th className="px-4 py-3 text-left text-xs font-bold tracking-[0.1em] uppercase text-outline">Room</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-[0.1em] uppercase text-outline">Guest</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-[0.1em] uppercase text-outline hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-right text-xs font-bold tracking-[0.1em] uppercase text-outline">Action</th>
            </tr></thead>
            <tbody>
              {manifest.map((entry) => (
                <tr key={entry.bookingId} className="border-b border-outline-variant/50">
                  <td className="px-4 py-3 font-mono font-medium text-on-surface">{entry.roomNumber}</td>
                  <td className="px-4 py-3"><p className="font-medium text-on-surface">{entry.guestName}</p></td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {entry.breakfastStatus === 'served' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check size={12} />Served at {entry.servedAt ? format(new Date(entry.servedAt), 'HH:mm') : '—'}</span>
                    ) : entry.breakfastStatus === 'expired' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600"><XCircle size={12} />Expired</span>
                    ) : <span className="text-xs text-amber-700">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entry.breakfastStatus === 'served' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><Check size={14} />Served</span>
                    ) : entry.breakfastStatus === 'expired' ? (
                      <Button size="sm" variant="outline" loading={resetting[entry.bookingId]} onClick={() => handleReset(entry)}><RotateCcw size={12} />Reset</Button>
                    ) : (
                      <Button size="sm" loading={serving[entry.bookingId]} onClick={() => handleServe(entry)}>Serve</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
