import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class RestockDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
