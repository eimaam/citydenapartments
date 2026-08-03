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

  private get isConnected(): boolean {
    return !!(this.client?.isOpen && this.client?.isReady);
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.client.get(key);
    } catch (err: any) {
      this.logger.warn(`Redis get failed for key "${key}": ${err.message}`);
      return null;
    }
  }

  // Store data with a Time-To-Live (TTL) in seconds
  /**
   * 
   * @param key
   * @param value 
   * @param [ttlSeconds] - default ttl to 1 hour 
   * 
   */
  async set(key: string, value: string, ttlSeconds: number = CACHE_TTL.ONE_HOUR): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.set(key, value, {
        EX: ttlSeconds,
      });
    } catch (err: any) {
      this.logger.warn(`Redis set failed for key "${key}": ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (err: any) {
      this.logger.warn(`Redis del failed for key "${key}": ${err.message}`);
    }
  }

  /**
   * 
   */
  async clearPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      let cursor = '0';
      do {
        const result = await this.client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length > 0) await this.client.del(result.keys);
      } while (cursor !== '0');
    } catch (err: any) {
      this.logger.warn(`Redis clearPattern failed for pattern "${pattern}": ${err.message}`);
    }
  }

  async invalidateDashboardCache(branchId?: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(CACHE_KEYS.DASHBOARD_SUMMARY);
      if (branchId) await this.client.del(`${CACHE_KEYS.DASHBOARD_SUMMARY}:${branchId}`);
    } catch (err: any) {
      this.logger.warn(`Redis invalidateDashboardCache failed: ${err.message}`);
    }
  }
}
