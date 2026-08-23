import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsMongoId } from 'class-validator';
import { ExpenseHeadType, type ExpenseHeadTypeType } from '@citydenapartments/shared';

export class CreateExpenseHeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ExpenseHeadType, { message: 'type must be either revenue_head or expenditure_head' })
  @IsNotEmpty()
  type: ExpenseHeadTypeType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  branchId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
