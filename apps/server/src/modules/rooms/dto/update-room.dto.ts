import { IsBoolean, IsMongoId, IsOptional, IsString, IsArray, IsNumber, Min, MinLength } from "class-validator";

export class UpdateRoomDto {
    @IsMongoId()
    @IsOptional()
    branchId: string
    
    @IsMongoId()
    @IsOptional()
    roomTypeId: string
    
    @IsString()
    @MinLength(1)
    @IsOptional()
    roomNumber: string
    
    @IsBoolean()
    @IsOptional()
    isActive?: boolean
    
    @IsNumber()
    @Min(1)
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