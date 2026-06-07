import { IsBoolean, IsString, MaxLength } from "class-validator";


export class CreateBranchDto {
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