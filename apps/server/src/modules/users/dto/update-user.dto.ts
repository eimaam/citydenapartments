import { IsEmail, IsString, IsEnum, IsOptional, IsMongoId, IsBoolean } from 'class-validator';
import { UserRoleEnum } from '../user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: UserRoleEnum;

  @IsOptional()
  @IsMongoId({ each: true })
  allowedBranches?: string[];

  @IsOptional()
  @IsMongoId()
  activeBranchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
