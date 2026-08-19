import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuCategory, MenuCategorySchema } from './schemas/menu-category.schema';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { RestaurantBanner, RestaurantBannerSchema } from './schemas/restaurant-banner.schema';
import { RestaurantMenuService } from './restaurant-menu.service';
import { RestaurantMenuController } from './restaurant-menu.controller';
import { PublicRestaurantMenuController } from './public-restaurant-menu.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: RestaurantBanner.name, schema: RestaurantBannerSchema },
    ]),
  ],
  controllers: [RestaurantMenuController, PublicRestaurantMenuController],
  providers: [RestaurantMenuService],
  exports: [RestaurantMenuService],
})
export class RestaurantMenuModule {}
