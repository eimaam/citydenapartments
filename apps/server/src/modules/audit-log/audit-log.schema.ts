import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, index: true })
  entityType: string;

  @Prop({ index: true })
  entityId: string;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  performedBy: Types.ObjectId;

  @Prop({ default: Date.now })
  performedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed })
  details: Record<string, any>;

  @Prop({ type: Date })
  expiresAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ performedAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
