import { IsString, IsNotEmpty, IsNumber, IsMongoId, IsDateString, Min } from 'class-validator';

export class CreateDepartmentExpenseDto {
  @IsMongoId()
  @IsNotEmpty()
  departmentId: string;

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

  @IsMongoId()
  @IsNotEmpty()
  branchId: string;
}
