import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../../common/decorators/public.decorator';
import { AppConfig } from '../../config/app.config';

@Controller('public')
@Public()
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('config')
  getConfig() {
    return {
      vatPercentage: AppConfig.VAT_PERCENTAGE,
      serviceChargePercentage: AppConfig.SERVICE_CHARGE_PERCENTAGE,
    };
  }

  @Get('room-types')
  getRoomTypes(@Query('branchCode') branchCode?: string) {
    return this.publicService.getRoomTypes(branchCode);
  }

  @Get('room-types/:id/rooms')
  getRoomTypeRooms(@Param('id') id: string) {
    return this.publicService.getRoomTypeRooms(id);
  }

  @Get('gallery')
  getGallery(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.publicService.getGallery(page, Math.min(limit, 100));
  }
}
