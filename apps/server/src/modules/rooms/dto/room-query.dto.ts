import { IsOptional, IsString } from 'class-validator';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class QueryRoomsDto extends PaginatedQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
