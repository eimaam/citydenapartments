import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, History, Eye, X, Code } from 'lucide-react';
import { format } from 'date-fns';
import { Input, Select, Option, Table, Drawer, Badge } from '@citydenapartments/shared';
import type { TableProps } from '@citydenapartments/shared';
import { auditApi, type AuditLogEntry } from '../api/audit.api';

const LIMIT = 25;

const ENTITY_TYPES = [
  { label: 'All Entities', value: '' },
  { label: 'Booking', value: 'Booking' },
  { label: 'User', value: 'User' },
  { label: 'Employee', value: 'Employee' },
  { label: 'Department', value: 'Department' },
  { label: 'Inventory', value: 'Inventory' },
  { label: 'Auth', value: 'Auth' },
];

const ACTIONS = [
  { label: 'All Actions', value: '' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'Check In', value: 'check_in' },
  { label: 'Check Out', value: 'check_out' },
  { label: 'Cancel', value: 'cancel' },
  { label: 'Login', value: 'login' },
  { label: 'Logout', value: 'logout' },
  { label: 'Switch Branch', value: 'switch_branch' },
  { label: 'Change Password', value: 'change_password' },
  { label: 'Reset Password', value: 'reset_password' },
  { label: 'Activate', value: 'activate' },
  { label: 'Restock', value: 'restock' },
  { label: 'Issue', value: 'issue' },
  { label: 'Spoilage', value: 'spoilage' },
];

const actionBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  check_in: 'success',
  check_out: 'warning',
  cancel: 'error',
  login: 'info',
  logout: 'default',
  restock: 'success',
  issue: 'warning',
  spoilage: 'error',
  activate: 'success',
  change_password: 'warning',
  reset_password: 'warning',
  switch_branch: 'info',
};

function DetailsDrawer({ entry, open, onClose }: { entry: AuditLogEntry | null; open: boolean; onClose: () => void }) {
  if (!entry) return null;

  const detailsJson = entry.details ? JSON.stringify(entry.details, null, 2) : null;

  return (
    <Drawer open={open} onClose={onClose} title="Audit Log Detail" size="lg">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Timestamp</p>
            <p className="text-sm">{format(new Date(entry.performedAt), 'd MMM yyyy, h:mm:ss a')}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Entity Type</p>
            <p className="text-sm">{entry.entityType}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Action</p>
            <Badge status={actionBadgeVariant[entry.action] || 'default'}>{entry.action.replace(/_/g, ' ')}</Badge>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Entity ID</p>
            <p className="text-xs font-mono text-outline">{entry.entityId || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Description</p>
            <p className="text-sm">{entry.description}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Performed By</p>
            <p className="text-sm">{entry.performedBy?.name || 'System'}</p>
            {entry.performedBy?.email && (
              <p className="text-xs text-outline">{entry.performedBy.email}</p>
            )}
          </div>
          {entry.branchId && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline mb-1">Branch</p>
              <p className="text-xs font-mono text-outline">{entry.branchId}</p>
            </div>
          )}
        </div>

        {detailsJson && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code size={14} className="text-outline" />
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-outline">Details Payload</p>
            </div>
            <pre className="text-xs bg-surface-container rounded-lg p-4 overflow-x-auto max-h-96 text-on-surface border border-outline-variant font-mono leading-relaxed">
              {detailsJson}
            </pre>
          </div>
        )}

        {entry.expiresAt && (
          <p className="text-[10px] text-outline italic">
            This log will auto-expire on {format(new Date(entry.expiresAt), 'd MMM yyyy')}
          </p>
        )}
      </div>
    </Drawer>
  );
}

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({
        page,
        limit: LIMIT,
        entityType: entityType || undefined,
        action: action || undefined,
        entityId: search || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, entityType, action, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { setPage(1); }, [entityType, action, search]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 400);
  };

  const openDetail = (entry: AuditLogEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  };

  const columns: TableProps<AuditLogEntry>['columns'] = [
    {
      title: 'Timestamp',
      dataIndex: 'performedAt',
      key: 'performedAt',
      width: 170,
      render: (_: unknown, r: AuditLogEntry) => (
        <span className="text-xs font-mono">{format(new Date(r.performedAt), 'd MMM, h:mm a')}</span>
      ),
      sorter: (a: AuditLogEntry, b: AuditLogEntry) =>
        new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Entity',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 100,
      render: (_: unknown, r: AuditLogEntry) => (
        <Badge status="default">{r.entityType}</Badge>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (_: unknown, r: AuditLogEntry) => (
        <Badge status={actionBadgeVariant[r.action] || 'default'}>
          {r.action.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Performed By',
      key: 'performedBy',
      width: 150,
      render: (_: unknown, r: AuditLogEntry) => (
        <span className="text-sm">{r.performedBy?.name || 'System'}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: unknown, r: AuditLogEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); openDetail(r); }}
          className="p-1.5 rounded text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer bg-transparent border-none transition-colors"
          title="View details"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-8 h-px bg-primary" />
        <span className="text-xs font-bold tracking-[0.15em] uppercase text-outline">Records</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <History size={22} className="text-outline" />
          <h1 className="font-serif text-2xl sm:text-3xl text-on-surface">Audit Logs</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
        <div className="w-44">
          <Select size="sm" value={entityType} onChange={(val) => setEntityType(val as string)} placeholder="Entity Type">
            {ENTITY_TYPES.map((t) => (
              <Option key={t.value} value={t.value}>{t.label}</Option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select size="sm" value={action} onChange={(val) => setAction(val as string)} placeholder="Action">
            {ACTIONS.map((a) => (
              <Option key={a.value} value={a.value}>{a.label}</Option>
            ))}
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            size="sm"
            placeholder="Search by entity ID..."
            prefix={<Search size={14} className="text-outline" />}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {(entityType || action || search) && (
          <button
            onClick={() => { setEntityType(''); setAction(''); setSearch(''); setSearchInput(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high rounded transition-colors cursor-pointer border-none"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <Table<AuditLogEntry>
          columns={columns}
          dataSource={items}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: LIMIT,
            total: total,
            showSizeChanger: false,
            showTotal: (total: number) => `${total} log${total !== 1 ? 's' : ''}`,
            onChange: (p) => setPage(p),
          }}
          onRow={(record) => ({
            onClick: () => openDetail(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <DetailsDrawer entry={selectedEntry} open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedEntry(null); }} />
    </div>
  );
}
