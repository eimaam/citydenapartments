import { IsString, IsMongoId, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

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
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsMongoId()
  createdBy: string;
}
