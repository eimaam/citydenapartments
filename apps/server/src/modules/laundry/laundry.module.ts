import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LaundryCategory, LaundryCategorySchema } from './laundry-category.schema';
import { LaundryItem, LaundryItemSchema } from './laundry-item.schema';
import { LaundryBill, LaundryBillSchema } from './laundry-bill.schema';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { LaundryController } from './laundry.controller';
import { LaundryService } from './laundry.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LaundryCategory.name, schema: LaundryCategorySchema },
      { name: LaundryItem.name, schema: LaundryItemSchema },
      { name: LaundryBill.name, schema: LaundryBillSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [LaundryController],
  providers: [LaundryService],
  exports: [LaundryService],
})
export class LaundryModule {}
