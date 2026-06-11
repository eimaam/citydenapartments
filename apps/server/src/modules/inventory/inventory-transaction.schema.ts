import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type TransactionType = 'restock' | 'issue' | 'adjustment';

@Schema({ timestamps: true })
export class InventoryTransaction extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryItem', required: true })
  itemId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ['restock', 'issue', 'adjustment'], required: true })
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

  @Prop()
  notes: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  performedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
