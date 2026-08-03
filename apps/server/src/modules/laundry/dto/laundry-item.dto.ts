import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';

export class CreateLaundryItemDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  item: string;

  @IsNumber()
  @Min(0)
  laundryPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pressingPrice?: number | null;
}

export class UpdateLaundryItemDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  item?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laundryPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pressingPrice?: number | null;
}
