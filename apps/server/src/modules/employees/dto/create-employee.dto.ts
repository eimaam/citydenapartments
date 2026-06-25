import { IsString, IsNotEmpty, IsOptional, IsEmail, IsMongoId } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsMongoId()
  @IsNotEmpty()
  branchId: string;
}
