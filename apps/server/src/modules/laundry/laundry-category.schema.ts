import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class LaundryCategory extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const LaundryCategorySchema = SchemaFactory.createForClass(LaundryCategory);

LaundryCategorySchema.pre('validate', function () {
  if (this.name) this.name = this.name.toUpperCase().trim();
});

LaundryCategorySchema.index({ name: 1 }, { unique: true });
