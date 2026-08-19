import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BreakfastModule } from './modules/breakfast/breakfast.module';
import { SeedModule } from './modules/seed/seed.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppConfig, AppConfigValidationSchema } from './config/app.config';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DiscountCodesModule } from './modules/discount-codes/discount-codes.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DepartmentExpensesModule } from './modules/department-expenses/department-expenses.module';
import { PublicModule } from './modules/public/public.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { EmailModule } from './modules/email/email.module';
import { LaundryModule } from './modules/laundry/laundry.module';
import { RevenueLogsModule } from './modules/revenue-logs/revenue-logs.module';
import { RestaurantMenuModule } from './modules/restaurant-menu/restaurant-menu.module';
import { RestaurantDeliveryModule } from './modules/restaurant-delivery/restaurant-delivery.module';
import { RestaurantOrdersModule } from './modules/restaurant-orders/restaurant-orders.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import mongoose from 'mongoose';

if (AppConfig.NODE_ENV === 'development') {
  mongoose.set('debug', true);
  mongoose.set('strictQuery', false);
}


@Module({
  imports: [
    MongooseModule.forRoot(AppConfig.MONGODB_URI),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: AppConfigValidationSchema,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 10,
    }, {
      name: 'medium',
      ttl: 10000,
      limit: 50,
    }, {
      name: 'long',
      ttl: 60000,
      limit: 200,
    }]),
    AuthModule,
    BranchesModule,
    UsersModule,
    RoomTypesModule,
    RoomsModule,
    BookingsModule,
    BreakfastModule,
    SeedModule,
    DashboardModule,
    HealthModule,
    InventoryModule,
    CustomersModule,
    EmployeesModule,
    DiscountCodesModule,
    DepartmentsModule,
    DepartmentExpensesModule,
    RedisModule,
    PublicModule,
    AuditLogModule,
    EmailModule,
    LaundryModule,
    RevenueLogsModule,
    RestaurantMenuModule,
    RestaurantDeliveryModule,
    RestaurantOrdersModule,
    TelegramBotModule,
  ],
  
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
