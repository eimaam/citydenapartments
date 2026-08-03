import { IsString, IsMongoId, IsEnum, IsOptional, IsNotEmpty, IsInt, Min, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LaundryService, LaundryStatus } from '@citydenapartments/shared';

export class CreateLaundryBillLineDto {
  @IsMongoId()
  itemId: string;

  @IsEnum(LaundryService, { message: 'service must be laundry or pressing' })
  service: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateLaundryBillDto {
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WalkInDto)
  walkIn?: { name: string; phone?: string };

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLaundryBillLineDto)
  lines: CreateLaundryBillLineDto[];

  @IsOptional()
  @IsEnum(LaundryStatus)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

class WalkInDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
