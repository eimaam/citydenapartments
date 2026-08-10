import { IsNumber, Min, IsOptional, IsString, IsMongoId } from 'class-validator';

export class IssueDto {
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  requestedBy?: string;

  @IsOptional()
  @IsMongoId()
  requestedEmployeeId?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
