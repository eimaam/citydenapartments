import { IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from './paginated-query.dto';

export class QueryInventoryItemsDto extends PaginatedQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  lowStock?: string;
}
