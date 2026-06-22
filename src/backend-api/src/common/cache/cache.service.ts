import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatStructuredLog } from '../logging/structured-log.util';
import { RedisService } from './redis.service';

export type CacheMetadata = {
  cachedAt: string;
  staleAt: string;
};

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private activeMisses = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisService.get(key);
      if (!value) {
        this.logger.log(formatStructuredLog('cache_miss', { key }));
        return null;
      }
      this.logger.log(formatStructuredLog('cache_hit', { key }));
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(
        formatStructuredLog('cache_get_failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redisService.setJson(
        key,
        JSON.stringify(value),
        this.withJitter(ttlSeconds),
      );
    } catch (error) {
      this.logger.warn(
        formatStructuredLog('cache_set_failed', {
          key,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async deleteKeys(...keys: string[]): Promise<void> {
    try {
      await this.redisService.del(...keys);
    } catch (error) {
      this.logger.warn(
        formatStructuredLog('cache_delete_failed', {
          keys,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisService.keys(pattern);
      if (keys.length > 0) {
        await this.redisService.del(...keys);
      }
      this.logger.log(
        formatStructuredLog('cache_pattern_invalidated', {
          pattern,
          keyCount: keys.length,
        }),
      );
    } catch (error) {
      this.logger.warn(
        formatStructuredLog('cache_pattern_delete_failed', {
          pattern,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async getOrLoad<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) {
      return cached;
    }

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      this.logger.log(formatStructuredLog('cache_miss_coalesced', { key }));
      return existing;
    }

    if (this.activeMisses >= this.getMissBudget()) {
      this.logger.warn(
        formatStructuredLog('cache_miss_budget_exhausted', { key }),
      );
      throw new Error('Public read query budget exhausted');
    }

    this.activeMisses += 1;
    const promise = loader()
      .then(async (value) => {
        await this.setJson(key, value, ttlSeconds);
        return value;
      })
      .finally(() => {
        this.activeMisses -= 1;
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  async incrementCounter(
    key: string,
    windowSeconds: number,
  ): Promise<{
    count: number;
    retryAfterSeconds: number;
    redisAvailable: boolean;
  }> {
    try {
      const count = await this.redisService.incrWithExpiry(key, windowSeconds);
      const ttl = await this.redisService.ttl(key);
      return {
        count,
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
        redisAvailable: true,
      };
    } catch {
      return {
        count: -1,
        retryAfterSeconds: windowSeconds,
        redisAvailable: false,
      };
    }
  }

  metadata(ttlSeconds: number): CacheMetadata {
    const cachedAt = new Date();
    return {
      cachedAt: cachedAt.toISOString(),
      staleAt: new Date(cachedAt.getTime() + ttlSeconds * 1000).toISOString(),
    };
  }

  withJitter(ttlSeconds: number): number {
    const jitterRatio = Number(
      this.configService.get('CACHE_TTL_JITTER_RATIO') ?? 0.15,
    );
    const maxJitter = Math.max(1, Math.floor(ttlSeconds * jitterRatio));
    return ttlSeconds + Math.floor(Math.random() * maxJitter);
  }

  getPublicConcertTtlSeconds(): number {
    return this.getNumber('PUBLIC_CONCERT_CACHE_TTL_SECONDS', 60);
  }

  getInventorySummaryTtlSeconds(): number {
    return this.getNumber('INVENTORY_SUMMARY_CACHE_TTL_SECONDS', 5);
  }

  private getMissBudget(): number {
    return this.getNumber('CACHE_MISS_QUERY_BUDGET', 8);
  }

  private getNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  }
}
