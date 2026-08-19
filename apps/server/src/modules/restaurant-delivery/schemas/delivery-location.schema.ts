import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class DeliveryLocation extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  zoneName: string; // e.g. "Wuse II", "Maitama", "Garki", "Utako"

  @Prop({ required: true, min: 0 })
  deliveryFee: number;

  @Prop({ default: 45 })
  estimatedDeliveryMinutes?: number;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const DeliveryLocationSchema = SchemaFactory.createForClass(DeliveryLocation);
DeliveryLocationSchema.index({ branchId: 1, zoneName: 1 }, { unique: true });
DeliveryLocationSchema.index({ branchId: 1, isActive: 1, sortOrder: 1 });
