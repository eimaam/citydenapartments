import { IsNumber, Min, IsOptional, IsString, IsMongoId } from 'class-validator';

export class IssueDto {
  @IsNumber()
  @Min(1)
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
  @IsString()
  notes?: string;
}
