import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('seed')
export class SeedController {
  constructor(private seedService: SeedService) {}

  @Public()
  @Post()
  seed() {
    return this.seedService.seed();
  }
}
