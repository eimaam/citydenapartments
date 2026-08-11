import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletTransactionType = 'credit' | 'debit';

@Schema({ timestamps: true })
export class CustomerWalletLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: false })
  bookingId?: Types.ObjectId;

  @Prop({ required: true, enum: ['credit', 'debit'] })
  type: WalletTransactionType;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, min: 0 })
  balanceBefore: number;

  @Prop({ required: true, min: 0 })
  balanceAfter: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;
}

export const CustomerWalletLogSchema = SchemaFactory.createForClass(CustomerWalletLog);
CustomerWalletLogSchema.index({ customerId: 1, createdAt: -1 });
