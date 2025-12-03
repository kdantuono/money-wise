import { Module, DynamicModule, Global, Provider, OnModuleDestroy, Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisModuleOptions {
  isGlobal?: boolean;
  useFactory?: (configService: ConfigService) => Redis;
}

@Injectable()
class RedisConnectionManager implements OnModuleDestroy {
  constructor(
    @Inject('default') private readonly redis: Redis,
  ) { }

  async onModuleDestroy() {
    try {
      // Use disconnect() instead of quit() for faster cleanup
      // disconnect() doesn't wait for pending replies, reducing race conditions
      if (this.redis && typeof this.redis.disconnect === 'function') {
        const status = this.redis.status;
        if (status !== 'end' && status !== 'close') {
          this.redis.disconnect();
        }
      }
    } catch (_error) {
      // Silently ignore all errors during cleanup
      // This is expected if connection is already closed by app.close()
    }
  }
}

@Global()
@Module({})
export class RedisModule {

  static forRoot(options: RedisModuleOptions = {}): DynamicModule {
    const redisProvider: Provider = {
      provide: 'default',
      useFactory: options.useFactory || ((configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });
      }),
      inject: [ConfigService],
    };

    return {
      module: RedisModule,
      global: options.isGlobal !== false,
      providers: [redisProvider, RedisConnectionManager],
      exports: ['default'],
    };
  }

  static forTest(mockRedis: unknown): DynamicModule {
    const redisProvider: Provider = {
      provide: 'default',
      useValue: mockRedis,
    };

    return {
      module: RedisModule,
      global: true,
      providers: [redisProvider],
      exports: ['default'],
    };
  }
}
