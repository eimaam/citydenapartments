import {
  IsString,
  IsNumber,
  IsDateString,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { PaymentMethod as PaymentMethodEnum, DiscountType as DiscountTypeEnum, DiscountTypeType as DiscountType } from '@citydenapartments/shared';

export class ExtendBookingDto {
  @IsDateString()
  newCheckOutDate: string;

  @IsNumber()
  @Min(0)
  additionalAmountPaid: number;

  @IsEnum(PaymentMethodEnum)
  paymentMethod: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  walletAmountApplied?: number;

  @IsOptional()
  @IsEnum(DiscountTypeEnum)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;

  @IsOptional()
  @IsBoolean()
  includeVat?: boolean;

  @IsOptional()
  @IsBoolean()
  includeServiceCharge?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  vatAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  serviceChargeAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
