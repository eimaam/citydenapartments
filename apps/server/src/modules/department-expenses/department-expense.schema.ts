import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class DepartmentExpense extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true })
  fromDate: Date;

  @Prop({ required: true })
  toDate: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  loggedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;
}

export const DepartmentExpenseSchema = SchemaFactory.createForClass(DepartmentExpense);
DepartmentExpenseSchema.index({ branchId: 1, departmentId: 1, fromDate: -1 });
