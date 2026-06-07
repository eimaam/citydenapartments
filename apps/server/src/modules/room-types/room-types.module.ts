import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomType, RoomTypeSchema } from './room-type.schema';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';
import { RedisService } from '../redis/redis.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: RoomType.name, schema: RoomTypeSchema }])],
  controllers: [RoomTypesController],
  providers: [RoomTypesService, RedisService],
})
export class RoomTypesModule {}
