import { NestFactory } from "@nestjs/core";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { Document } from "mongoose"

export interface IBranch {
  name: string;
  code: string;
  address: string;
  isActive: boolean
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
}


export const BranchSchema = SchemaFactory.createForClass(Branch)

