import { IsString, IsNumber, IsOptional, Min, IsBoolean, IsDateString } from 'class-validator';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
