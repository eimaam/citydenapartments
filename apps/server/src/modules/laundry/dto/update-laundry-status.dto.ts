import { IsEnum } from 'class-validator';
import { LaundryStatus } from '@citydenapartments/shared';

export class UpdateLaundryStatusDto {
  @IsEnum(LaundryStatus, { message: 'status must be pending or paid' })
  status: string;
}
