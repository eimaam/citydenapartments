import { IsBoolean, IsMongoId, IsOptional, IsString } from "class-validator";

export class UpdateRoomDto {
    @IsMongoId()
    @IsOptional()
    branchId: string
    
    @IsMongoId()
    @IsOptional()
    roomTypeId: string
    
    @IsString()
    @IsOptional()
    roomNumber: string
    
    @IsBoolean()
    @IsOptional()
    isActive?: boolean
    
    @IsString()
    @IsOptional()
    maxGuests?: number
}