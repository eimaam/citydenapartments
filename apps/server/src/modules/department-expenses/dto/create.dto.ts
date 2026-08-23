import { IsString, IsNotEmpty, IsNumber, IsMongoId, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';
import { ExpenseHeadType, type ExpenseHeadTypeType } from '@citydenapartments/shared';

export class CreateDepartmentExpenseDto {
  @IsMongoId()
  @IsNotEmpty()
  departmentId: string;

  @IsEnum(ExpenseHeadType, { message: 'headType must be either revenue_head or expenditure_head' })
  @IsNotEmpty()
  headType: ExpenseHeadTypeType;

  @IsString()
  @IsNotEmpty()
  expenseHead: string;

  @IsOptional()
  @IsMongoId()
  expenseHeadId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  fromDate: string;

  @IsDateString()
  toDate: string;
}
