import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { UsersModule } from './modules/users/users.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { BreakfastModule } from './modules/breakfast/breakfast.module';
import { SeedModule } from './modules/seed/seed.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppConfig, AppConfigValidationSchema } from './config/app.config';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './modules/redis/redis.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
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
    AuthModule,
    BranchesModule,
    UsersModule,
    RoomTypesModule,
    RoomsModule,
    BookingsModule,
    BreakfastModule,
    // SeedModule,
    DashboardModule,
    RedisModule,
  ],
  
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
