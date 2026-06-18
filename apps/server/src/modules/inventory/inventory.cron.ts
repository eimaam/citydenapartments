import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryCron {
  private readonly logger = new Logger(InventoryCron.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Cron('0 0 * * *')
  async handleDailyClose() {
    this.logger.log('Daily inventory auto-close triggered');

    try {
      const result = await this.inventoryService.autoCloseDay();
      this.logger.log(`Daily inventory auto-close completed — ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Daily inventory auto-close failed: ${(error as Error).message}`);
    }
  }
}
