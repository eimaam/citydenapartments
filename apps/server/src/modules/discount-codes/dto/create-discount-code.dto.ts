import { IsNumber, IsOptional, Min, Max, IsDateString, IsString } from 'class-validator';

export class CreateDiscountCodeDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  percentage: number;

  @IsOptional()
  @IsString()
  branchId?: string;

  // [multi-use] uncomment to allow setting usage cap
  // @IsOptional()
  // @IsNumber()
  // @Min(1)
  // maxUsage?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
