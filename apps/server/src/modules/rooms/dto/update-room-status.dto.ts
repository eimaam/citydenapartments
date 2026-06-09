import { IsEnum } from 'class-validator';
import { RoomStatusEnum } from '../room.schema';

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatusEnum)
  status: RoomStatusEnum;
}
