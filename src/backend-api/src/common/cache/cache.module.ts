import { Global, Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { RateLimitGuard } from './rate-limit.guard';
import { RedisService } from './redis.service';
import { AuthModule } from '../../modules/auth/auth.module';

@Global()
@Module({
  imports: [AuthModule],
  providers: [
    RedisService,
    CacheService,
    CacheInvalidationService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [RedisService, CacheService, CacheInvalidationService],
})
export class CacheModule {}
