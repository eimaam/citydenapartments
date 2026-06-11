import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  unit: string;

  @IsNumber()
  @Min(0)
  currentStock: number;

  @IsNumber()
  @Min(0)
  reorderLevel: number;
}
