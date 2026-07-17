import { api } from '../../../lib/api';

export interface AuditLogEntry {
  _id: string;
  entityType: string;
  entityId?: string;
  action: string;
  description: string;
  performedBy?: { _id: string; name: string; email: string };
  performedAt: string;
  branchId?: string;
  details?: Record<string, unknown>;
  expiresAt?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogsQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export const auditApi = {
  list: (query: AuditLogsQuery = {}) => {
    const params = new URLSearchParams();
    if (query.entityType) params.set('entityType', query.entityType);
    if (query.entityId) params.set('entityId', query.entityId);
    if (query.action) params.set('action', query.action);
    if (query.branchId) params.set('branchId', query.branchId);
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    const qs = params.toString();
    return api.get<PaginatedAuditLogs>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },
};
