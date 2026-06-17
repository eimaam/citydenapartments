import { IsString, IsNotEmpty } from 'class-validator';

export class SearchCustomerDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}
