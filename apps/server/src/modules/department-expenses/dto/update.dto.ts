import { IsString, IsOptional, IsNumber, IsMongoId, IsDateString, IsEnum, Min } from 'class-validator';
import { ExpenseHeadType, type ExpenseHeadTypeType } from '@citydenapartments/shared';

export class UpdateDepartmentExpenseDto {
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsEnum(ExpenseHeadType, { message: 'headType must be either revenue_head or expenditure_head' })
  headType?: ExpenseHeadTypeType;

  @IsOptional()
  @IsString()
  expenseHead?: string;

  @IsOptional()
  @IsMongoId()
  expenseHeadId?: string;

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
