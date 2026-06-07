import { IsBoolean, IsMongoId, IsOptional, IsString } from "class-validator";

export class UpdateRoomDto {
    @IsMongoId()
    branchId: string
    
    @IsMongoId()
    roomTypeId: string
    
    @IsString()
    roomNumber: string
    
    @IsBoolean()
    @IsOptional()
    isActive?: boolean
    
    @IsString()
    @IsOptional()
    maxGuests?: number
}