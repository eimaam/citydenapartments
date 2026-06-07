import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BookingStatus = 'Confirmed' | 'Checked_In' | 'Checked_Out' | 'Cancelled';
export type PaymentMethod = 'POS_Card' | 'Cash' | 'Bank_Transfer';
export type BookingSource = 'WalkIn' | 'Phone' | 'Online';

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ required: true, unique: true })
  bookingReference: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  roomId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: { name: { type: String, required: true }, phone: { type: String, required: true }, email: String },
    required: true,
  })
  guestDetails: { name: string; phone: string; email?: string };

  @Prop({ default: 1 })
  numberOfGuests: number;

  @Prop({ required: true })
  checkInDate: Date;

  @Prop({ required: true })
  checkOutDate: Date;

  @Prop({ required: true })
  actualPricePerNight: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop()
  discountReason: string;

  @Prop({ required: true })
  totalAmountPaid: number;

  @Prop({ type: String, enum: ['POS_Card', 'Cash', 'Bank_Transfer'], required: true })
  paymentMethod: string;

  @Prop()
  paymentReference: string;

  @Prop({
    type: String,
    enum: ['Confirmed', 'Checked_In', 'Checked_Out', 'Cancelled'],
    default: 'Confirmed',
  })
  bookingStatus: BookingStatus;

  @Prop({
    type: String,
    enum: ['WalkIn', 'Phone', 'Online'],
    default: 'WalkIn',
  })
  bookingSource: BookingSource;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  bookedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  checkedInBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  checkedOutBy: MongooseSchema.Types.ObjectId;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
