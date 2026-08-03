import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class LaundryItem extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'LaundryCategory', required: true, index: true })
  categoryId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  item: string;

  @Prop({ required: true, min: 0 })
  laundryPrice: number;

  @Prop({ type: Number, min: 0, default: null })
  pressingPrice: number | null;

  @Prop({ default: true })
  isActive: boolean;
}

export const LaundryItemSchema = SchemaFactory.createForClass(LaundryItem);

LaundryItemSchema.pre('validate', function () {
  if (this.item) this.item = this.item.trim();
});

LaundryItemSchema.index({ categoryId: 1, item: 1 }, { unique: true });
