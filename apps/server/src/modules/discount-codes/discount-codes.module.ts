import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscountCode, DiscountCodeSchema } from './discount-code.schema';
import { DiscountCodesController } from './discount-codes.controller';
import { DiscountCodesService } from './discount-codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DiscountCode.name, schema: DiscountCodeSchema }]),
  ],
  controllers: [DiscountCodesController],
  providers: [DiscountCodesService],
  exports: [DiscountCodesService],
})
export class DiscountCodesModule {}
