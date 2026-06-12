import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class BreakfastLog extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
  bookingId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  roomId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  guestName: string;

  @Prop({ required: true })
  dateServed: Date;

  @Prop({ default: 1 })
  servingsClaimed: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  servedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ['served', 'expired'], default: 'served' })
  status: string;
}

export const BreakfastLogSchema = SchemaFactory.createForClass(BreakfastLog);
BreakfastLogSchema.index({ bookingId: 1, dateServed: 1 });
