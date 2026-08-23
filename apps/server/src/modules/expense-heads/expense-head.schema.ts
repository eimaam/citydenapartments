import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ExpenseHeadType } from '@citydenapartments/shared';

@Schema({ timestamps: true })
export class ExpenseHead extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Object.values(ExpenseHeadType), index: true })
  type: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', default: null, index: true })
  branchId?: MongooseSchema.Types.ObjectId | null;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy?: MongooseSchema.Types.ObjectId;
}

export const ExpenseHeadSchema = SchemaFactory.createForClass(ExpenseHead);
ExpenseHeadSchema.index({ name: 1, type: 1, branchId: 1 }, { unique: true });
