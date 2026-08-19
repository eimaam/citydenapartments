import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  RestaurantOrderStatus,
  RestaurantDeliveryType,
  RestaurantPaymentMethod,
  RestaurantPaymentStatus,
} from '@citydenapartments/shared';
import type {
  RestaurantOrderStatusType,
  RestaurantDeliveryTypeType,
  RestaurantPaymentMethodType,
  RestaurantPaymentStatusType,
} from '@citydenapartments/shared';

@Schema({ _id: false })
export class OrderSelectedOptionSchemaClass {
  @Prop({ required: true })
  groupName: string;

  @Prop({ required: true })
  optionName: string;

  @Prop({ default: 0 })
  extraPrice: number;
}

@Schema({ _id: false })
export class OrderItemSizeSchemaClass {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}

@Schema({ _id: false })
export class OrderItemLineSchemaClass {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'MenuItem', required: true })
  menuItemId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  image?: string;

  @Prop({ type: OrderItemSizeSchemaClass })
  selectedSize?: OrderItemSizeSchemaClass;

  @Prop({ type: [OrderSelectedOptionSchemaClass], default: [] })
  selectedOptions: OrderSelectedOptionSchemaClass[];

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  lineTotal: number;

  @Prop({ trim: true })
  specialInstructions?: string;
}

@Schema({ _id: false })
export class OrderCustomerSchemaClass {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  email?: string;
}

@Schema({ _id: false })
export class OrderDeliveryLocationSchemaClass {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DeliveryLocation' })
  zoneId?: MongooseSchema.Types.ObjectId;

  @Prop({ trim: true })
  zoneName?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  notes?: string;
}

@Schema({ _id: false })
export class OrderTimelineEventSchemaClass {
  @Prop({ type: String, enum: Object.values(RestaurantOrderStatus), required: true })
  status: RestaurantOrderStatusType;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ trim: true })
  updatedBy?: string;

  @Prop({ trim: true })
  notes?: string;
}

@Schema({ timestamps: true })
export class RestaurantOrder extends Document {
  @Prop({ required: true, unique: true, index: true, uppercase: true })
  orderNumber: string; // e.g. "CDA-ORD-2026-0812"

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true, index: true })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: OrderCustomerSchemaClass, required: true })
  customer: OrderCustomerSchemaClass;

  @Prop({ default: false })
  isGuestLodged: boolean;

  @Prop({ trim: true })
  roomNumber?: string;

  @Prop({
    type: String,
    enum: Object.values(RestaurantDeliveryType),
    default: RestaurantDeliveryType.InRoom,
  })
  deliveryType: RestaurantDeliveryTypeType;

  @Prop({ type: OrderDeliveryLocationSchemaClass })
  deliveryLocation?: OrderDeliveryLocationSchemaClass;

  @Prop({ trim: true })
  orderNotes?: string;

  @Prop({ type: [OrderItemLineSchemaClass], required: true })
  items: OrderItemLineSchemaClass[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  deliveryFee: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({
    type: String,
    enum: Object.values(RestaurantOrderStatus),
    default: RestaurantOrderStatus.Received,
    index: true,
  })
  orderStatus: RestaurantOrderStatusType;

  @Prop({
    type: String,
    enum: Object.values(RestaurantPaymentMethod),
    default: RestaurantPaymentMethod.PayOnDelivery,
  })
  paymentMethod: RestaurantPaymentMethodType;

  @Prop({
    type: String,
    enum: Object.values(RestaurantPaymentStatus),
    default: RestaurantPaymentStatus.Pending,
    index: true,
  })
  paymentStatus: RestaurantPaymentStatusType;

  @Prop({ type: [OrderTimelineEventSchemaClass], default: [] })
  timeline: OrderTimelineEventSchemaClass[];

  @Prop()
  telegramMessageId?: number;
}

export const RestaurantOrderSchema = SchemaFactory.createForClass(RestaurantOrder);
RestaurantOrderSchema.index({ branchId: 1, createdAt: -1 });
RestaurantOrderSchema.index({ branchId: 1, orderStatus: 1 });
RestaurantOrderSchema.index({ 'customer.phone': 1 });
