import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export const TransactionTypeEnum = {
  Restock: 'restock',
  Issue: 'issue',
  Adjustment: 'adjustment',
  Spoilage: 'spoilage',
  Disposal: 'disposal',
  Transfer: 'transfer',
} as const;
export type TransactionType = 'restock' | 'issue' | 'adjustment' | 'spoilage' | 'disposal' | 'transfer';

@Schema({ timestamps: true })
export class InventoryTransaction extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryItem', required: true })
  itemId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, lowercase: true, enum: Object.values(TransactionTypeEnum), required: true })
  type: TransactionType;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  previousStock: number;

  @Prop({ required: true })
  newStock: number;

  @Prop()
  requestedBy: string;

  @Prop()
  department: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  departmentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  fromDepartmentId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department' })
  toDepartmentId?: MongooseSchema.Types.ObjectId;

  @Prop()
  transferRefId?: string;

  @Prop()
  notes: string;

  @Prop()
  unitPrice?: number;

  @Prop()
  totalCost?: number;

  @Prop()
  previousUnitPrice?: number;

  @Prop()
  newUnitPrice?: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  performedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
