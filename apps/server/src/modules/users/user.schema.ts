import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum UserRoleEnum {
  SUPER_ADMIN = 'SuperAdmin',
  GROUP_GM = 'GroupGM',
  FACILITY_MANAGER = 'FacilityManager',
  FRONT_OFFICE_MANAGER = 'FrontOfficeManager',
  ACCOUNTANT = 'Accountant',
  HOUSE_KEEPER = 'HouseKeeper',
  RECEPTION = 'Reception',
  KITCHEN_STAFF = 'KitchenStaff',
  STORE_MANAGER = 'StoreManager',
  STORE_KEEPER = 'StoreKeeper',
  IT = 'IT',
};

export type UserRole = 'SuperAdmin' | 'GroupGM' | 'FacilityManager' | 'FrontOfficeManager' | 'Accountant' | 'HouseKeeper' | 'Reception' | 'KitchenStaff' | 'StoreManager' | 'StoreKeeper' | 'IT';


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
