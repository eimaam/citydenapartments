import { IsBoolean, IsMongoId, IsOptional, IsString, IsArray } from "class-validator";

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

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    amenities?: string[]

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[]
}