import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  @IsNotEmpty()
  branchId: string;
}
