import { IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from './paginated-query.dto';

export class QuerySnapshotsDto extends PaginatedQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
