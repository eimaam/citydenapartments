import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum RoomStatusEnum {
  AVAILABLE = "available",
  OCCUPIED = "occupied",
  DIRTY = "dirty",
  MAINTENANCE = "maintenance"
}

export type RoomStatus = 'Available' | 'Occupied' | 'Dirty' | 'Maintenance';

@Schema({ timestamps: true })
export class Room extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'RoomType', required: true })
  roomTypeId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, uppercase: true })
  roomNumber: string;

  @Prop({ default: 2 })
  maxGuests: number;

  @Prop({
    type: String,
    lowercase: true,
    enum: RoomStatusEnum,
    default: RoomStatusEnum.AVAILABLE,
  })
  status: RoomStatus;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.Types.ObjectId;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
RoomSchema.index({ branchId: 1, roomNumber: 1 }, { unique: true });
