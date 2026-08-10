import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class RestockDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
