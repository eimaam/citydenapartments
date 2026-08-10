import { IsString, IsNumber, IsOptional, Min, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsNumber()
  @Min(0)
  currentStock: number;

  @IsNumber()
  @Min(0)
  reorderLevel: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
