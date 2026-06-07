import { IsString, IsBoolean, MaxLength } from "class-validator"


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
}