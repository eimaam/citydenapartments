import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type PaymentMethod = 'pos_card' | 'cash' | 'bank_transfer';
export type BookingSource = 'walk_in' | 'phone' | 'online';

@Schema({ timestamps: true })
export class Booking extends Document {
  @Prop({ required: true, unique: true })
  bookingReference: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true })
  roomId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      address: { type: String, required: true },
      nationality: { type: String, required: true },
      dob: Date,
      phone2: String,
      comingFrom: { type: String, required: true },
      stateOfOrigin: { type: String, required: true },
      occupation: { type: String, required: true },
      nextDestination: { type: String, required: true },
      gender: { type: String, required: true, enum: ['male', 'female'] },
      religion: String,
    },
    required: true,
  })
  guestDetails: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    nationality: string;
    dob?: Date;
    phone2?: string;
    comingFrom: string;
    stateOfOrigin: string;
    occupation: string;
    nextDestination: string;
    gender: string;
    religion?: string;
  };

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

  @Prop({ type: String, enum: ['fixed', 'percentage'], lowercase: true, default: 'fixed' })
  discountType: string;

  @Prop({ default: 0 })
  discountPercentage: number;

  @Prop()
  discountReason: string;

  @Prop({ required: true })
  totalAmountPaid: number;

  @Prop({ type: String, enum: ['pos_card', 'cash', 'bank_transfer'], lowercase: true, required: true })
  paymentMethod: string;

  @Prop()
  paymentReference: string;

  @Prop({
    type: String,
    lowercase: true,
    enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled'],
    default: 'checked_in',
  })
  bookingStatus: BookingStatus;

  @Prop({
    type: String,
    lowercase: true,
    enum: ['walk_in', 'phone', 'online'],
    default: 'walk_in',
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
