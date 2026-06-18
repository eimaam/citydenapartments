import { IsString, MinLength } from 'class-validator';

export class SearchEmployeeDto {
  @IsString()
  @MinLength(1)
  q: string;
}
