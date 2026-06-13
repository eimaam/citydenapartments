import { IsString, IsBoolean, MaxLength, IsOptional, ValidateNested, IsArray } from "class-validator"
import { Type } from "class-transformer";

class BranchPoliciesDto {
    @IsString()
    @IsOptional()
    checkInTime?: string;

    @IsString()
    @IsOptional()
    checkOutTime?: string;

    @IsString()
    @IsOptional()
    earlyCheckIn?: string;

    @IsString()
    @IsOptional()
    lateCheckOut?: string;

    @IsString()
    @IsOptional()
    cancellation?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    houseRules?: string[];

    @IsString()
    @IsOptional()
    paymentInfo?: string;

    @IsString()
    @IsOptional()
    breakfastInfo?: string;

    @IsString()
    @IsOptional()
    contactPhone?: string;

    @IsString()
    @IsOptional()
    contactEmail?: string;

    @IsString()
    @IsOptional()
    additionalNotes?: string;
}

export class BranchUpdateDto {
    @IsString()
    name: string;

    @IsString()
    code: string

    @IsString()
    @MaxLength(100)
    address: string

    @IsBoolean()
    isActive: boolean

    @ValidateNested()
    @Type(() => BranchPoliciesDto)
    @IsOptional()
    policies?: BranchPoliciesDto;
}