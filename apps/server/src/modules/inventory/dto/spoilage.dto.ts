import { IsString, IsNumber, IsInt, IsOptional, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SpoilageTypeEnum } from '../spoilage-report.schema';

export class ReportSpoilageDto {
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsEnum(SpoilageTypeEnum)
  spoilageType: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QuerySpoilageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}
