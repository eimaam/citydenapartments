import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from './customer.schema';
import { Booking, BookingSchema } from '../bookings/booking.schema';
import { LaundryBill, LaundryBillSchema } from '../laundry/laundry-bill.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: LaundryBill.name, schema: LaundryBillSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}

