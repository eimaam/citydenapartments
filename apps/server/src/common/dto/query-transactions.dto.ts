import { IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from './paginated-query.dto';

export class QueryTransactionsDto extends PaginatedQueryDto {
  @IsOptional()
  @IsString()
  itemId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
