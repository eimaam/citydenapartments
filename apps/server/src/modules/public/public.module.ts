import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoomType, RoomTypeSchema } from '../room-types/room-type.schema';
import { Room, RoomSchema } from '../rooms/room.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
