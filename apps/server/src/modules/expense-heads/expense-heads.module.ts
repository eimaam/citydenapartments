import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpenseHead, ExpenseHeadSchema } from './expense-head.schema';
import { ExpenseHeadsService } from './expense-heads.service';
import { ExpenseHeadsController } from './expense-heads.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ExpenseHead.name, schema: ExpenseHeadSchema }]),
  ],
  controllers: [ExpenseHeadsController],
  providers: [ExpenseHeadsService],
  exports: [ExpenseHeadsService, MongooseModule],
})
export class ExpenseHeadsModule {}
