import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { LaundryService as LaundryServiceEnum, LaundryStatus as LaundryStatusEnum } from '@citydenapartments/shared';

@Schema({ _id: false })
export class LaundryBillLine {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LaundryItem', required: true })
  itemId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  itemName: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: String, enum: Object.values(LaundryServiceEnum), required: true })
  service: string;

  @Prop({ required: true, min: 1 })
  qty: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;
}

export const LaundryBillLineSchema = SchemaFactory.createForClass(LaundryBillLine);

@Schema({ timestamps: true })
export class LaundryBill extends Document {
  @Prop({ required: true, unique: true })
  billNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer' })
  customerId?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
    },
  })
  walkIn?: { name: string; phone?: string };

  @Prop({ trim: true })
  roomNumber?: string;

  @Prop({ type: [LaundryBillLineSchema], required: true })
  lines: LaundryBillLine[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ type: String, enum: Object.values(LaundryStatusEnum), default: LaundryStatusEnum.Pending })
  status: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;
}

export const LaundryBillSchema = SchemaFactory.createForClass(LaundryBill);

LaundryBillSchema.index({ branchId: 1, createdAt: -1 });
LaundryBillSchema.index({ branchId: 1, status: 1 });
