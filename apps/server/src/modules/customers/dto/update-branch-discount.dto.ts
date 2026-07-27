import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateBranchDiscountDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
