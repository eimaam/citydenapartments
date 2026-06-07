import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRoleEnum } from '../../users/user.schema';


export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsEnum(UserRoleEnum)
  role: UserRoleEnum;
}
