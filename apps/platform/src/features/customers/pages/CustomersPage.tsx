import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Button, Input, Table, Drawer, Badge, RoomStatus, type BookingStatusType } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { Search } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../lib/api';
import type { CustomerResponse } from '../../bookings/api/customers.api';

const LIMIT = 20;

interface PaginatedData {
  items: CustomerResponse[];
  total: number;
  page: number;
  limit: number;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedData>({ items: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [detail, setDetail] = useState<CustomerResponse | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedData>(`/customers?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(search)}`);
      setData({ items: res.items, total: res.total, page: res.page, limit: res.limit });
    } catch { toast('error', 'Failed to load customers.'); }
    finally { setLoading(false); }
  }, [toast, page, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const columns: TableProps<CustomerResponse>['columns'] = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (_: unknown, r: CustomerResponse) => (
      <div><p className="font-medium">{r.name}</p><p className="text-xs text-outline">{r.phone}</p></div>
    )},
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v: unknown) => v ? <span className="text-xs">{v as string}</span> : <span className="text-xs text-outline">—</span> },
    { title: 'Visits', dataIndex: 'totalVisits', key: 'visits', width: 80, align: 'center' as const },
    { title: 'Total Spent', dataIndex: 'totalSpent', key: 'spent', width: 130, align: 'right' as const,
      render: (v: unknown) => <span className="font-medium">₦{(v as number)?.toLocaleString()}</span> },
    { title: 'Last Visit', dataIndex: 'lastVisitDate', key: 'lastVisit', width: 140,
      render: (v: unknown) => v ? format(new Date(v as string), 'd MMM yyyy') : <span className="text-outline">—</span> },
    { title: 'Nationality', dataIndex: 'nationality', key: 'nationality', width: 120, responsive: ['md' as const] },
    { title: 'Occupation', dataIndex: 'occupation', key: 'occ', width: 130, responsive: ['lg' as const] },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6"><span className="w-8 h-px bg-primary" /><span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Directory</span></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Customers</h1>
        <Input size="sm" placeholder="Search name, phone, email..." prefix={<Search size={14} className="text-outline" />}
          value={searchInput} onChange={(e) => onSearchChange(e.target.value)} className="!w-72" />
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<CustomerResponse>
          columns={columns}
          dataSource={data.items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: data.page,
            pageSize: data.limit,
            total: data.total,
            showSizeChanger: true,
            showTotal: (total: number) => `${total} customer${total !== 1 ? 's' : ''}`,
            onChange: (p) => setPage(p),
          }}
          onRow={(record) => ({ onClick: () => setDetail(record), style: { cursor: 'pointer' } })}
        />
      </div>

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="Customer Details" width={480}>
        {detail && (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-outline">Name</p>
              <p className="font-medium text-lg">{detail.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-outline">Phone</p><p className="font-medium">{detail.phone}</p></div>
              <div><p className="text-xs text-outline">Email</p><p className="font-medium">{detail.email || '—'}</p></div>
              <div><p className="text-xs text-outline">Gender</p><p className="font-medium capitalize">{detail.gender}</p></div>
              <div><p className="text-xs text-outline">Nationality</p><p className="font-medium">{detail.nationality}</p></div>
              <div><p className="text-xs text-outline">State of Origin</p><p className="font-medium">{detail.stateOfOrigin}</p></div>
              <div><p className="text-xs text-outline">Occupation</p><p className="font-medium">{detail.occupation}</p></div>
              {detail.dob && <div><p className="text-xs text-outline">DOB</p><p className="font-medium">{format(new Date(detail.dob), 'd MMM yyyy')}</p></div>}
              {detail.phone2 && <div><p className="text-xs text-outline">Phone 2</p><p className="font-medium">{detail.phone2}</p></div>}
              {detail.religion && <div><p className="text-xs text-outline">Religion</p><p className="font-medium">{detail.religion}</p></div>}
            </div>
            <div className="border-t border-outline-variant/60 pt-4">
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-2">Per-Visit Info</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-outline">Address</p><p className="font-medium">{detail.address}</p></div>
                <div><p className="text-xs text-outline">Coming From</p><p className="font-medium">{detail.comingFrom}</p></div>
                <div><p className="text-xs text-outline">Next Destination</p><p className="font-medium">{detail.nextDestination}</p></div>
              </div>
            </div>
            <div className="border-t border-outline-variant/60 pt-4">
              <p className="text-xs font-bold tracking-[0.1em] uppercase text-outline mb-2">Stats</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-xs text-outline">Total Visits</p><p className="font-medium text-lg">{detail.totalVisits}</p></div>
                <div><p className="text-xs text-outline">Total Spent</p><p className="font-medium text-lg">₦{detail.totalSpent?.toLocaleString()}</p></div>
                <div><p className="text-xs text-outline">Last Visit</p><p className="font-medium text-lg">{detail.lastVisitDate ? format(new Date(detail.lastVisitDate), 'd MMM yyyy') : '—'}</p></div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
