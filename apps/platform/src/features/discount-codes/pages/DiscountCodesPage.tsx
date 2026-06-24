import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Drawer, Table, Badge, RoomStatus } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Search, Plus, Hash, Calendar } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { discountCodesApi, type DiscountCode } from '../api/discount-codes.api';
import { useAuth } from '../../../contexts/auth';
import { UserRole } from '@citydenapartments/shared';
import { format } from 'date-fns';

const LIMIT = 20;

export default function DiscountCodesPage() {
  const { user } = useAuth();
  
  const { toast } = useToast();
  const canToggle = user ? [UserRole.SuperAdmin, UserRole.GroupGM].includes(user.role as any) : false;

  const [data, setData] = useState<{ items: DiscountCode[]; total: number; page: number; limit: number }>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ percentage: 5, expiresAt: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await discountCodesApi.list({ page, limit: LIMIT, search: search || undefined });
      setData(res);
    } catch { toast('error', 'Failed to load discount codes.'); }
    finally { setLoading(false); }
  }, [page, search, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const generate = async () => {
    if (genForm.percentage < 1) { toast('error', 'Percentage must be at least 1.'); return; }
    setSaving(true);
    try {
      await discountCodesApi.generate({
        percentage: genForm.percentage,
        expiresAt: genForm.expiresAt || undefined,
      });
      toast('success', 'Discount code generated.');
      setShowGenerate(false);
      setGenForm({ percentage: 5, expiresAt: '' });
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (id: string) => {
    if (!canToggle) return;
    try {
      await discountCodesApi.toggleActive(id);
      toast('success', 'Discount code status updated.');
      fetchAll();
    } catch (e: any) { toast('error', e.message); }
  };

  const columns: TableProps<DiscountCode>['columns'] = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 150,
      render: (v: string) => <span className="font-mono font-bold tracking-wider">{v}</span> },
    { title: 'Discount', dataIndex: 'percentage', key: 'pct', width: 100,
      render: (v: number) => <span className="font-bold text-emerald-600">{v}%</span> },
    { title: 'Usage', key: 'usage', width: 80,
      render: (_: unknown, r: DiscountCode) => (
        <span className="text-sm">{r.usedCount >= 1 ? 'Used' : 'Unused'}</span>
      )},
    { title: 'Created By', key: 'createdBy', width: 180,
      render: (_: unknown, r: DiscountCode) => (
        <span className="text-xs">{r.createdBy?.name || '—'}</span>
      )},
    { title: 'Expires', key: 'expires', width: 130,
      render: (_: unknown, r: DiscountCode) => (
        <span className="text-xs">{r.expiresAt ? format(new Date(r.expiresAt), 'MMM d, yyyy') : 'Never'}</span>
      )},
    { title: 'Status', key: 'status', width: 100,
      render: (_: unknown, r: DiscountCode) => (
        <Badge status={r.isActive ? RoomStatus.Available : RoomStatus.Maintenance} />
      )},
    { title: 'Created', key: 'createdAt', width: 130,
      render: (_: unknown, r: DiscountCode) => (
        <span className="text-xs">{format(new Date(r.createdAt), 'MMM d, yyyy')}</span>
      )},
  ];

  if (canToggle) {
    columns.push({
      title: 'Actions', key: 'action', width: 130,
      render: (_: unknown, r: DiscountCode) => (
        <Button size="sm" variant={r.isActive ? 'destructive' : 'default'}
          onClick={(e) => { e.stopPropagation(); toggleActive(r._id); }}>
          {r.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    });
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Promotions</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Discount Codes</h1>
        <div className="flex items-center gap-3">
          <Input size="sm" placeholder="Search codes..." prefix={<Search size={14} className="text-outline" />}
            value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-64" />
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowGenerate(true)}>Generate</Button>
        </div>
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<DiscountCode>
          columns={columns}
          dataSource={data.items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: data.page,
            pageSize: data.limit,
            total: data.total,
            showSizeChanger: true,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      <Drawer open={showGenerate} onClose={() => setShowGenerate(false)} title="Generate Discount Code" size="sm"
        footer={<div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setShowGenerate(false)}>Cancel</Button>
          <Button loading={saving} onClick={generate}>Generate</Button></div>}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline block mb-1">Discount Percentage *</label>
            <Input size="lg" type="number" min={1} max={100}
              value={genForm.percentage} onChange={(e) => setGenForm({ ...genForm, percentage: Number(e.target.value) })} />
          </div>
          {/* [multi-use] uncomment to restore max usage input
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline block mb-1">Max Uses (0 = unlimited)</label>
            <Input size="lg" type="number" min={0}
              value={genForm.maxUsage} onChange={(e) => setGenForm({ ...genForm, maxUsage: Number(e.target.value) })} />
          </div>
          */}
          <div>
            <label className="text-xs font-bold tracking-[0.1em] uppercase text-outline block mb-1">Expires At (optional)</label>
            <Input size="lg" type="date"
              value={genForm.expiresAt} onChange={(e) => setGenForm({ ...genForm, expiresAt: e.target.value })} />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
