import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';

interface DependencyStatus {
  status: 'up' | 'down';
  latency?: number;
  error?: string;
}

export interface HealthResult {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  dependencies: {
    mongodb: DependencyStatus;
    redis: DependencyStatus;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectConnection() 
    private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
  ) {}

  async check(): Promise<HealthResult> {
    this.logger.log('Health check started');

    const [mongo, redis] = await Promise.all([
      this.checkMongo(),
      this.checkRedis(),
    ]);

    const allUp = mongo.status === 'up' && redis.status === 'up';

    if (allUp) {
      this.logger.debug('Health check — all dependencies healthy');
    }

    return {
      status: allUp ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies: { mongodb: mongo, redis },
    };
  }

  private async checkMongo(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      await this.mongoConnection.db?.admin().ping();
      return { status: 'up', latency: Date.now() - start };
    } catch (error: any) {
      this.logger.error(`Health check — MongoDB DOWN: ${error.message}`);
      return { status: 'down', error: error.message };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      await this.redisService.set('health:ping', 'pong', 10);
      const val = await this.redisService.get('health:ping');
      if (val !== 'pong') throw new Error('Redis read/write mismatch');
      return { status: 'up', latency: Date.now() - start };
    } catch (error: any) {
      this.logger.error(`Health check — Redis DOWN: ${error.message}`);
      return { status: 'down', error: error.message };
    }
  }
}
