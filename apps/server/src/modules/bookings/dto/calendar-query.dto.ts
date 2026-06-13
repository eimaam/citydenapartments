import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CalendarQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsOptional()
  roomId?: string;
}
