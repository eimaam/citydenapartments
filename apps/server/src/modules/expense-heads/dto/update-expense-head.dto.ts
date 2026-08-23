import { IsString, IsOptional, IsEnum, IsBoolean, IsMongoId } from 'class-validator';
import { ExpenseHeadType, type ExpenseHeadTypeType } from '@citydenapartments/shared';

export class UpdateExpenseHeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ExpenseHeadType, { message: 'type must be either revenue_head or expenditure_head' })
  type?: ExpenseHeadTypeType;

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
