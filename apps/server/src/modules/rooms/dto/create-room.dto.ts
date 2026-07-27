import { IsString, IsMongoId, IsNumber, IsArray, IsOptional, Min, MinLength } from 'class-validator';

export class CreateRoomDto {
  @IsOptional()
  @IsMongoId()
  branchId?: string;
  
  @IsMongoId()
  roomTypeId: string;
  
  @IsString()
  @MinLength(1)
  roomNumber: string;
  
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGuests?: number;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}
