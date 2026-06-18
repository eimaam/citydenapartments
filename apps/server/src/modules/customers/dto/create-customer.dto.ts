import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Gender } from '@citydenapartments/shared';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0\d{10}$/, { message: 'Phone must be a valid 11-digit Nigerian mobile number starting with 0' })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  nationality: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsString()
  @Matches(/^0\d{10}$/, { message: 'Phone must be a valid 11-digit Nigerian mobile number starting with 0' })
  phone2?: string;

  @IsString()
  @IsNotEmpty()
  comingFrom: string;

  @IsString()
  @IsNotEmpty()
  stateOfOrigin: string;

  @IsString()
  @IsNotEmpty()
  occupation: string;

  @IsString()
  @IsNotEmpty()
  nextDestination: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  firstBranchId?: string;
}
