import { IsNumber, IsOptional, Min, Max, IsDateString } from 'class-validator';

export class CreateDiscountCodeDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  percentage: number;

  // [multi-use] uncomment to allow setting usage cap
  // @IsOptional()
  // @IsNumber()
  // @Min(1)
  // maxUsage?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
