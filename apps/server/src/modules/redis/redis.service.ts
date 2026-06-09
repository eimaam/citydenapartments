import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { AppConfig } from '../../config/app.config';
import { CACHE_TTL, CACHE_KEYS } from '../../config/cache.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    const url = AppConfig.REDIS_URL
      ? AppConfig.REDIS_URL
      : `redis://${AppConfig.REDIS_HOST || 'localhost'}:${AppConfig.REDIS_PORT || 6379}`;
    this.client = createClient({ url });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Redis connected');
    } catch (err: any) {
      this.logger.warn(`Redis connection failed — running without cache: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.client.destroy();
    this.logger.log('Redis disconnected');
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // Store data with a Time-To-Live (TTL) in seconds
  /**
   * 
   * @param key
   * @param value 
   * @param [ttlSeconds] - default ttl to 1 hour 
   * 
   */
  async set(key: string, value: string, ttlSeconds:number = CACHE_TTL.ONE_HOUR): Promise<void> {
    await this.client.set(key, value, {
      EX: ttlSeconds,
    });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async invalidateDashboardCache(branchId?: string): Promise<void> {
    await this.client.del(CACHE_KEYS.DASHBOARD_SUMMARY);
    if (branchId) await this.client.del(`${CACHE_KEYS.DASHBOARD_SUMMARY}:${branchId}`);
  }
}
