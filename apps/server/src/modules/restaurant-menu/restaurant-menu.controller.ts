import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RestaurantMenuService } from './restaurant-menu.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@citydenapartments/shared';

@Controller('restaurant-menu')
export class RestaurantMenuController {
  constructor(private readonly menuService: RestaurantMenuService) {}

  // ── Upload Image to R2 ──────────────────────────────────────────
  @Post('upload-image')
  @Roles(
    UserRole.SuperAdmin,
    UserRole.GroupGM,
    UserRole.FacilityManager,
    UserRole.KitchenStaff,
    UserRole.Reception,
    UserRole.IT,
    UserRole.FrontOfficeManager,
  )
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif|svg\+xml)$/)) {
        return cb(new BadRequestException('Only image files (JPG, PNG, WebP, SVG) are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<{ url: string; key: string }> {
    return this.menuService.uploadImage(file);
  }

  // ── Categories (Admin) ──────────────────────────────────────────
  @Get('categories')
  async getCategories(@Query('branchId') branchId: string, @ActiveUser() user: any): Promise<any[]> {
    const activeBranchId = branchId || user.activeBranchId || user.allowedBranches?.[0];
    return this.menuService.getCategories(activeBranchId, false);
  }

  @Post('categories')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.KitchenStaff, UserRole.IT, UserRole.FrontOfficeManager)
  async createCategory(@Body() body: any, @ActiveUser() user: any) {
    const branchId = body.branchId || user.activeBranchId;
    return this.menuService.createCategory(branchId, body, user);
  }

  @Patch('categories/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.KitchenStaff, UserRole.IT, UserRole.FrontOfficeManager)
  async updateCategory(@Param('id') id: string, @Body() body: any, @ActiveUser() user: any) {
    return this.menuService.updateCategory(id, body, user);
  }

  @Delete('categories/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT, UserRole.FrontOfficeManager)
  async deleteCategory(@Param('id') id: string, @ActiveUser() user: any) {
    return this.menuService.deleteCategory(id, user);
  }

  // ── Menu Items (Admin) ──────────────────────────────────────────
  @Get('items')
  async getMenuItems(
    @Query('branchId') branchId: string,
    @Query('categoryId') categoryId: string,
    @Query('search') search: string,
    @Query('isAvailable') isAvailable: string,
    @Query('isChefSpecial') isChefSpecial: string,
    @Query('tags') tags: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @ActiveUser() user: any,
  ) {
    const activeBranchId = branchId || user.activeBranchId || user.allowedBranches?.[0];
    return this.menuService.getMenuItems({
      branchId: activeBranchId,
      categoryId,
      search,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
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

  @Post('items')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.KitchenStaff, UserRole.IT, UserRole.FrontOfficeManager)
  async createMenuItem(@Body() body: any, @ActiveUser() user: any) {
    const branchId = body.branchId || user.activeBranchId;
    return this.menuService.createMenuItem(branchId, body, user);
  }

  @Patch('items/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.KitchenStaff, UserRole.IT, UserRole.FrontOfficeManager)
  async updateMenuItem(@Param('id') id: string, @Body() body: any, @ActiveUser() user: any) {
    return this.menuService.updateMenuItem(id, body, user);
  }

  @Patch('items/:id/toggle-availability')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.KitchenStaff, UserRole.Reception, UserRole.IT, UserRole.FrontOfficeManager)
  async toggleAvailability(@Param('id') id: string, @ActiveUser() user: any) {
    return this.menuService.toggleAvailability(id, user);
  }

  @Delete('items/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT, UserRole.FrontOfficeManager)
  async deleteMenuItem(@Param('id') id: string, @ActiveUser() user: any) {
    return this.menuService.deleteMenuItem(id, user);
  }

  // ── Banners (Admin) ─────────────────────────────────────────────
  @Get('banners')
  async getBanners(@Query('branchId') branchId?: string) {
    return this.menuService.getBanners(branchId, false);
  }

  @Post('banners')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT, UserRole.FrontOfficeManager)
  async createBanner(@Body() body: any, @ActiveUser() user: any) {
    return this.menuService.createBanner(body, user);
  }

  @Patch('banners/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT, UserRole.FrontOfficeManager)
  async updateBanner(@Param('id') id: string, @Body() body: any, @ActiveUser() user: any) {
    return this.menuService.updateBanner(id, body, user);
  }

  @Delete('banners/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT, UserRole.FrontOfficeManager)
  async deleteBanner(@Param('id') id: string, @ActiveUser() user: any) {
    return this.menuService.deleteBanner(id, user);
  }
}
