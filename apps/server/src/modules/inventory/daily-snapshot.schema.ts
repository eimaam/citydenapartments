import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class DailySnapshot extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'InventoryItem', required: true })
  itemId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  openingStock: number;

  @Prop({ required: true })
  closingStock: number;

  @Prop({ default: 0 })
  totalRestocks: number;

  @Prop({ default: 0 })
  totalIssues: number;

  @Prop({ default: 0 })
  totalAdjustments: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  autoClosed: boolean;
}

export const DailySnapshotSchema = SchemaFactory.createForClass(DailySnapshot);
DailySnapshotSchema.index({ itemId: 1, date: 1 }, { unique: true });
