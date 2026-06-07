import {
  IsString,
  IsMongoId,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentMethod, BookingStatus, BookingSource } from '../booking.schema';

export class CreateBookingDto {
  @IsMongoId()
  roomId: string;

  @IsString()
  guestName: string;

  @IsString()
  guestPhone: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  numberOfGuests?: number;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(0)
  actualPricePerNight: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsNumber()
  @Min(0)
  totalAmountPaid: number;

  @IsEnum(['POS_Card', 'Cash', 'Bank_Transfer'])
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsEnum(['Confirmed', 'Checked_In', 'Checked_Out', 'Cancelled'])
  bookingStatus?: BookingStatus;

  @IsOptional()
  @IsEnum(['WalkIn', 'Phone', 'Online'])
  bookingSource?: BookingSource;
}
