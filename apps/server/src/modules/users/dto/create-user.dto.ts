import { IsEmail, IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { UserRoleEnum } from '../user.schema';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsEnum(UserRoleEnum)
  role: UserRoleEnum;

  @IsOptional()
  @IsMongoId({ each: true })
  allowedBranches?: string[];
}
