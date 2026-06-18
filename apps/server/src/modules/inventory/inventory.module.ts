import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { InventoryItem, InventoryItemSchema } from './inventory-item.schema';
import { InventoryTransaction, InventoryTransactionSchema } from './inventory-transaction.schema';
import { DailySnapshot, DailySnapshotSchema } from './daily-snapshot.schema';
import { SpoilageReport, SpoilageReportSchema } from './spoilage-report.schema';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryCron } from './inventory.cron';
import { RedisService } from '../redis/redis.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: DailySnapshot.name, schema: DailySnapshotSchema },
      { name: SpoilageReport.name, schema: SpoilageReportSchema },
    ]),
    RedisModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryCron],
})
export class InventoryModule {}
