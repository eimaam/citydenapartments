import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SwitchBranchDto } from './dto/switch-branch.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  getProfile(@ActiveUser() user:any) {
    return this.authService.getProfileById(user.id)

  }

  @Post('switch-branch')
  switchBranch(@Body() dto: SwitchBranchDto, @ActiveUser() user: any) {
    return this.authService.switchBranch(user.id, dto);
  }

  @Post('logout')
  async logout(@ActiveUser() user: any) {
    await this.authService.logout(user.id);
    return { message: 'Signed out successfully.' };
  }

  @Post('change-password')
  changePassword(
    @ActiveUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
