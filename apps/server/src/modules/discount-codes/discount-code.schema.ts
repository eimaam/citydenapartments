import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class DiscountCode extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true, min: 1, max: 100 })
  percentage: number;

  @Prop({ default: 0 })
  usedCount: number;

  // [multi-use] uncomment to allow multiple uses per code
  // @Prop()
  // maxUsage: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt: Date;
}

export const DiscountCodeSchema = SchemaFactory.createForClass(DiscountCode);
