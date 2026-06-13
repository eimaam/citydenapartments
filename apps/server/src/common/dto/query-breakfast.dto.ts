import { IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from './paginated-query.dto';

export class QueryBreakfastDto extends PaginatedQueryDto {
  @IsOptional()
  @IsString()
  date?: string;
}
