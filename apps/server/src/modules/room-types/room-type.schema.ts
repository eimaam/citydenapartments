import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class RoomType extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, maxLength: 30 })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  basePrice: number;

  @Prop({ required: true })
  minPriceAllowed: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.Types.ObjectId;
}

export const RoomTypeSchema = SchemaFactory.createForClass(RoomType);
RoomTypeSchema.index({ branchId: 1, name: 1 }, { unique: true });
