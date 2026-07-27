import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './audit-log.schema';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  private getExpiry(persistForever = false): Date | undefined {
    if (persistForever) return undefined;
    const days = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  async log(params: {
    entityType: string;
    entityId?: string;
    action: string;
    description: string;
    performedBy: string;
    branchId?: string;
    details?: Record<string, any>;
    persistForever?: boolean;
  }) {
    const { entityType, entityId, action, description, performedBy, branchId, details, persistForever } = params;
    try {
      await this.auditLogModel.create({
        entityType,
        entityId,
        action,
        description,
        performedBy,
        branchId: branchId || undefined,
        details,
        performedAt: new Date(),
        expiresAt: this.getExpiry(persistForever),
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${error instanceof Error ? error.message : error}`);
    }
  }

  async findAll(params: {
    entityType?: string;
    entityId?: string;
    action?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    const { entityType, entityId, action, branchId, page = 1, limit = 50 } = params;
    const filter: Record<string, any> = {};
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (action) filter.action = action;
    if (branchId) filter.branchId = branchId;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('performedBy', 'name email')
        .sort({ performedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }
}
