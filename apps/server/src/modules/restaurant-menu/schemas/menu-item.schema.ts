import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { OptionSelectionType } from '@citydenapartments/shared';
import type { OptionSelectionTypeType } from '@citydenapartments/shared';

@Schema({ _id: false })
export class MenuItemSizeSchemaClass {
  @Prop({ required: true, trim: true })
  name: string; // e.g. "Small", "Regular", "Large", "Single", "Double"

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: false })
  isDefault?: boolean;
}

@Schema({ _id: false })
export class MenuItemOptionItemSchemaClass {
  @Prop({ required: true, trim: true })
  name: string; // e.g. "Miyan Kuka", "Miyan Geda", "Goat Meat", "Extra Pepper"

  @Prop({ default: 0, min: 0 })
  extraPrice: number;

  @Prop({ default: true })
  isAvailable: boolean;
}

@Schema({ _id: false })
export class MenuItemOptionGroupSchemaClass {
  @Prop({ required: true, trim: true })
  name: string; // e.g. "Choose Your Soup", "Choice of Protein", "Extras"

  @Prop({ default: false })
  required: boolean;

  @Prop({ default: 0 })
  minSelections?: number;

  @Prop({ default: 1 })
  maxSelections?: number;

  @Prop({ type: String, enum: Object.values(OptionSelectionType), default: OptionSelectionType.SingleSelect })
  selectionType: OptionSelectionTypeType;

  @Prop({ type: [MenuItemOptionItemSchemaClass], default: [] })
  options: MenuItemOptionItemSchemaClass[];
}

@Schema({ timestamps: true })
export class MenuItem extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true })
  categoryId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: 0, min: 0 })
  basePrice: number;

  @Prop({ default: false })
  hasSizes: boolean;

  @Prop({ type: [MenuItemSizeSchemaClass], default: [] })
  sizes: MenuItemSizeSchemaClass[];

  @Prop({ type: [MenuItemOptionGroupSchemaClass], default: [] })
  optionGroups: MenuItemOptionGroupSchemaClass[];

  @Prop({ default: 15 })
  estimatedPrepTimeMinutes?: number;

  @Prop({ default: true, index: true })
  isAvailable: boolean;

  @Prop({ default: false, index: true })
  isChefSpecial: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[]; // e.g. "spicy", "vegetarian", "breakfast", "popular"

  @Prop({ default: 0 })
  sortOrder: number;
}

export const MenuItemSchema = SchemaFactory.createForClass(MenuItem);
MenuItemSchema.index({ branchId: 1, categoryId: 1, isAvailable: 1 });
MenuItemSchema.index({ branchId: 1, name: 'text', description: 'text', tags: 'text' });
