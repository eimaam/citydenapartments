import { IsMongoId, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRevenueLogDto {
  @IsMongoId()
  departmentId: string;

  @IsDateString()
  revenueDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cashAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  posAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transferAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
