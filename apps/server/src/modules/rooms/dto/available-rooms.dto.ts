import { IsDateString, IsOptional } from 'class-validator';

export class AvailableRoomsDto {
  @IsDateString()
  checkIn: string;

  @IsDateString()
  checkOut: string;

  @IsOptional()
  @IsDateString()
  branchId?: string;
}
