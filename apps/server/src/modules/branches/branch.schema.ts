import { NestFactory } from "@nestjs/core";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export interface IBranch {
  name: string;
  code: string;
  address: string;
  isActive: boolean;
}

export interface IBranchPolicies {
  checkInTime: string;
  checkOutTime: string;
  earlyCheckIn: string;
  lateCheckOut: string;
  cancellation: string;
  houseRules: string[];
  paymentInfo: string;
  breakfastInfo: string;
  contactPhone: string;
  contactEmail: string;
  additionalNotes: string;
}

@Schema({ timestamps: true })
export class Branch extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, uppercase: true, unique: true })
  code: string

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, default: true })
  isActive: boolean

  @Prop({ type: Object, default: {} })
  policies: IBranchPolicies
}


export const BranchSchema = SchemaFactory.createForClass(Branch)

