import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class IssueDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  requestedBy?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
