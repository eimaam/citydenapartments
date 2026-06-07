import { IsString, IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateRoomDto {
  @IsMongoId()
  branchId: string;
  
  @IsMongoId()
  roomTypeId: string;
  
  @IsString()
  roomNumber: string;
  
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGuests?: number;
  
  @IsMongoId()
  createdBy: string;
}
