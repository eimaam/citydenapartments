import { IsString, IsOptional, IsNumber, IsMongoId, IsDateString, Min } from 'class-validator';

export class UpdateDepartmentExpenseDto {
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
