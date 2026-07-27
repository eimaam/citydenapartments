import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentExpense, DepartmentExpenseSchema } from './department-expense.schema';
import { DepartmentExpensesController } from './department-expenses.controller';
import { DepartmentExpensesService } from './department-expenses.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DepartmentExpense.name, schema: DepartmentExpenseSchema }]),
  ],
  controllers: [DepartmentExpensesController],
  providers: [DepartmentExpensesService],
  exports: [DepartmentExpensesService, MongooseModule],
})
export class DepartmentExpensesModule {}
