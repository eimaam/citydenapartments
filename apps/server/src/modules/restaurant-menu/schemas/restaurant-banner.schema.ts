import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BannerType } from '@citydenapartments/shared';
import type { BannerTypeType } from '@citydenapartments/shared';

@Schema({ timestamps: true })
export class RestaurantBanner extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', default: null, index: true })
  branchId?: MongooseSchema.Types.ObjectId | null; // null means applies to all branches

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  subtitle?: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ type: String, enum: Object.values(BannerType), default: BannerType.MealPromo })
  bannerType: BannerTypeType;

  @Prop({ trim: true })
  actionLink?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const RestaurantBannerSchema = SchemaFactory.createForClass(RestaurantBanner);
RestaurantBannerSchema.index({ branchId: 1, isActive: 1, sortOrder: 1 });
