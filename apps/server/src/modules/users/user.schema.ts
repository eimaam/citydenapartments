import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum UserRoleEnum {
  SUPER_ADMIN =  'SuperAdmin',
  BRANCH_MANAGER = 'BranchManager',
  STORE_MANAGER = 'StoreManager',
  STORE_KEEPER = 'StoreKeeper',
  RECEPTION = 'Reception',
  KITCHEN_STAFF = 'KitchenStaff',
  SOCIAL_MEDIA_MANAGER = 'SocialMediaManager',
  HOUSE_KEEPER = 'HouseKeeper',
};


export type UserRole = 'SuperAdmin' | 'BranchManager' | 'StoreManager' | 'StoreKeeper' | 'Reception' | 'KitchenStaff' | 'SocialMediaManager' | 'HouseKeeper';


@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: UserRoleEnum,
    required: true,
  })
  role: UserRole;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Branch' }], default: [] })
  allowedBranches: MongooseSchema.Types.ObjectId[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
  activeBranchId: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  passwordChangedAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
