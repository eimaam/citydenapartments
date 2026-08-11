import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class RevenueLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId: Types.ObjectId;

  @Prop({ required: true, type: Date, index: true })
  revenueDate: Date;

  @Prop({ default: 0, min: 0 })
  cashAmount: number;

  @Prop({ default: 0, min: 0 })
  posAmount: number;

  @Prop({ default: 0, min: 0 })
  transferAmount: number;

  @Prop({ default: 0, min: 0 })
  otherAmount: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  loggedBy: Types.ObjectId;

  @Prop({ required: true, type: Date, default: Date.now })
  loggedAt: Date;
}

export const RevenueLogSchema = SchemaFactory.createForClass(RevenueLog);
RevenueLogSchema.index({ branchId: 1, revenueDate: -1 });
RevenueLogSchema.index({ branchId: 1, departmentId: 1, revenueDate: -1 });
