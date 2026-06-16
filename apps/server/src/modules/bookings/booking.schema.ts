import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BookingStatus as BookingStatusEnum, Gender as GenderEnum, PaymentMethod as PaymentMethodEnum, BookingSource as BookingSourceEnum, DiscountType as DiscountTypeEnum } from '@citydenapartments/shared';

export type BookingStatus = 'reserved' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
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
      gender: { type: String, required: true, lowercase: true, enum: Object.values(GenderEnum) },
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

  @Prop({ type: String, enum: Object.values(DiscountTypeEnum), lowercase: true, default: 'fixed' })
  discountType: string;

  @Prop({ default: 0 })
  discountPercentage: number;

  @Prop()
  discountReason: string;

  @Prop({ required: true })
  totalAmountPaid: number;

  @Prop({ type: String, enum: Object.values(PaymentMethodEnum), lowercase: true, required: true })
  paymentMethod: string;

  @Prop()
  paymentReference: string;

  @Prop({
    type: String,
    lowercase: true,
    enum: Object.values(BookingStatusEnum),
    default: BookingStatusEnum.Checked_In,
  })
  bookingStatus: BookingStatus;

  @Prop({
    type: String,
    lowercase: true,
    enum: Object.values(BookingSourceEnum),
    default: BookingSourceEnum.WalkIn,
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
BookingSchema.index({ branchId: 1, bookingStatus: 1 });
