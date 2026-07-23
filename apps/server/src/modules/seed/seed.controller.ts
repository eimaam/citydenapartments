import { Controller, Post, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ProdSeedService } from './prod-seed.service';
import { Public } from '../../common/decorators/public.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRoleEnum } from '../users/user.schema';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('seed')
export class SeedController {
  constructor(
    private seedService: SeedService,
    private prodSeedService: ProdSeedService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleEnum.SUPER_ADMIN)
  seed() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seed endpoint is disabled in production.' };
    }
    return this.seedService.seed();
  }

  @Post('sync-images')
  @Public()
  syncImages() {
    return this.seedService.syncRoomTypeImages();
  }

  @Post('staff')
  @Public()
  seedStaff() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seed endpoint is disabled in production.' };
    }
    return this.seedService.seedStaff();
  }

  @Post('prod')
  @Public()
  seedProd() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Seed endpoint is disabled in production.' };
    }
    return this.prodSeedService.seedProd();
  }
}
