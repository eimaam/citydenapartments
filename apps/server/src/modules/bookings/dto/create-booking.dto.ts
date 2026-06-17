import {
  IsString,
  IsMongoId,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { PaymentMethod, BookingStatus, BookingSource } from '../booking.schema';
import { Gender, BookingStatus as BookingStatusEnum, PaymentMethod as PaymentMethodEnum, BookingSource as BookingSourceEnum } from '@citydenapartments/shared';

export class CreateBookingDto {
  @IsMongoId()
  roomId: string;

  @IsString()
  guestName: string;

  @IsString()
  guestPhone: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsString()
  @IsNotEmpty()
  guestAddress: string;

  @IsString()
  @IsNotEmpty()
  guestNationality: string;

  @IsOptional()
  @IsDateString()
  guestDob?: string;

  @IsOptional()
  @IsString()
  guestPhone2?: string;

  @IsString()
  @IsNotEmpty()
  guestComingFrom: string;

  @IsString()
  @IsNotEmpty()
  guestStateOfOrigin: string;

  @IsString()
  @IsNotEmpty()
  guestOccupation: string;

  @IsString()
  @IsNotEmpty()
  guestNextDestination: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Gender)
  guestGender: string;

  @IsOptional()
  @IsString()
  guestReligion?: string;

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

  // @IsNumber()
  // @Min(0)
  // @IsOptional()
  // discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsNumber()
  @Min(0)
  totalAmountPaid: number;

  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsEnum(BookingStatusEnum)
  bookingStatus?: BookingStatus;

  @IsOptional()
  @IsEnum(BookingSourceEnum)
  bookingSource?: BookingSource;
}
