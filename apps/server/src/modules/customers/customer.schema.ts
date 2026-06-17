import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Gender as GenderEnum } from '@citydenapartments/shared';

@Schema({ timestamps: true })
export class Customer extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  nationality: string;

  @Prop()
  dob?: Date;

  @Prop()
  phone2?: string;

  @Prop({ required: true })
  comingFrom: string;

  @Prop({ required: true })
  stateOfOrigin: string;

  @Prop({ required: true })
  occupation: string;

  @Prop({ required: true })
  nextDestination: string;

  @Prop({ required: true, lowercase: true, enum: Object.values(GenderEnum) })
  gender: string;

  @Prop()
  religion?: string;

  @Prop({ default: 0 })
  totalVisits: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop()
  lastVisitDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  firstBranchId?: Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ phone: 1 }, { unique: true });
