import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';

@Controller('seed')
export class SeedController {
  constructor(private seedService: SeedService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleEnum.SUPER_ADMIN)
  seed() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seed endpoint is disabled in production.' };
    }
    return this.seedService.seed();
  }
}
