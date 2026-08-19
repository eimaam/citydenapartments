import { Controller, Get, Query, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RestaurantMenuService } from './restaurant-menu.service';

@Controller('public/restaurant-menu')
@Public()
export class PublicRestaurantMenuController {
  constructor(private readonly menuService: RestaurantMenuService) {}

  @Get('categories')
  async getCategories(@Query('branchId') branchId: string): Promise<any[]> {
    if (!branchId) return [];
    return this.menuService.getCategories(branchId, true);
  }

  @Get('items')
  async getMenuItems(
    @Query('branchId') branchId: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isChefSpecial') isChefSpecial?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!branchId) return { items: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    return this.menuService.getMenuItems({
      branchId,
      categoryId,
      search,
      onlyAvailable: true,
      isChefSpecial: isChefSpecial !== undefined ? isChefSpecial === 'true' : undefined,
      tags,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('items/:id')
  async getMenuItemById(@Param('id') id: string) {
    return this.menuService.getMenuItemById(id);
  }

  @Get('banners')
  async getBanners(@Query('branchId') branchId?: string) {
    return this.menuService.getBanners(branchId, true);
  }
}
