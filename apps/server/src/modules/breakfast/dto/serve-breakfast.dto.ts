import { IsMongoId, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ServeBreakfastDto {
  @IsMongoId()
  bookingId: string;

  @IsMongoId()
  roomId: string;

  @IsString()
  guestName: string;

  @IsString()
  dateServed: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  servingsClaimed?: number;
}
