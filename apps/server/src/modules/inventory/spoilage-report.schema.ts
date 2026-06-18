import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export const SpoilageTypeEnum = {
  Expired: 'expired',
  Damaged: 'damaged',
  Contaminated: 'contaminated',
  Stolen: 'stolen',
  Lost: 'lost',
  Other: 'other',
} as const;
export type SpoilageType = (typeof SpoilageTypeEnum)[keyof typeof SpoilageTypeEnum];

export const SpoilageStatusEnum = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type SpoilageStatus = (typeof SpoilageStatusEnum)[keyof typeof SpoilageStatusEnum];

interface StatusChangeEntry {
  fromStatus: SpoilageStatus;
  toStatus: SpoilageStatus;
  changedBy: MongooseSchema.Types.ObjectId;
  changedAt: Date;
}

@Schema({ timestamps: true })
export class SpoilageReport extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryItem', required: true })
  itemId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  quantity: number;

  @Prop({ lowercase: true, enum: Object.values(SpoilageTypeEnum), required: true })
  spoilageType: SpoilageType;

  @Prop({ required: true })
  reason: string;

  @Prop()
  notes: string;

  @Prop({ lowercase: true, enum: Object.values(SpoilageStatusEnum), default: SpoilageStatusEnum.Pending })
  status: SpoilageStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  reportedBy: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  reportedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  respondedBy?: MongooseSchema.Types.ObjectId;

  @Prop()
  respondedAt?: Date;

  @Prop({ type: [{ fromStatus: String, toStatus: String, changedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' }, changedAt: Date }], default: [] })
  statusHistory: StatusChangeEntry[];
}

export const SpoilageReportSchema = SchemaFactory.createForClass(SpoilageReport);
SpoilageReportSchema.index({ branchId: 1, status: 1 });
SpoilageReportSchema.index({ itemId: 1 });
