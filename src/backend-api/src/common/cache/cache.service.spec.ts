import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';

describe('CacheService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'CACHE_TTL_JITTER_RATIO') {
        return '0';
      }
      if (key === 'CACHE_MISS_QUERY_BUDGET') {
        return '8';
      }
      return undefined;
    }),
  } as unknown as ConfigService;

  let redisService: jest.Mocked<RedisService>;
  let service: CacheService;

  beforeEach(() => {
    redisService = {
      get: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      incrWithExpiry: jest.fn(),
      ttl: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;
    service = new CacheService(configService, redisService);
  });

  it('returns cached JSON values without calling the loader', async () => {
    redisService.get.mockResolvedValue(JSON.stringify({ id: 'concert-1' }));
    const loader = jest.fn();

    const result = await service.getJson<{ id: string }>('concert:detail:1');

    expect(result).toEqual({ id: 'concert-1' });
    expect(loader).not.toHaveBeenCalled();
  });

  it('coalesces concurrent cache misses for the same key', async () => {
    redisService.get.mockResolvedValue(null);
    const loader = jest.fn().mockResolvedValue({ items: ['a'] });

    const [first, second] = await Promise.all([
      service.getOrLoad('concert:list:test', 60, loader),
      service.getOrLoad('concert:list:test', 60, loader),
    ]);

    expect(first).toEqual({ items: ['a'] });
    expect(second).toEqual({ items: ['a'] });
    expect(loader).toHaveBeenCalledTimes(1);
    expect(redisService.setJson.mock.calls).toContainEqual([
      'concert:list:test',
      JSON.stringify({ items: ['a'] }),
      expect.any(Number),
    ]);
  });

  it('does not consume DB miss budget for computed cache values', async () => {
    redisService.get.mockResolvedValue(null);

    const result = await service.getOrLoad('concert:list:test', 60, async () =>
      Promise.all(
        Array.from({ length: 12 }, (_, index) =>
          service.getOrLoad(
            `inventory:summary:${index}`,
            5,
            () => Promise.resolve({ availableCount: index }),
            { consumeMissBudget: false },
          ),
        ),
      ),
    );

    expect(result).toHaveLength(12);
    expect(redisService.setJson.mock.calls).toHaveLength(13);
  });

  it('still enforces miss budget for DB-backed loads by default', async () => {
    redisService.get.mockResolvedValue(null);
    let releaseLoads: () => void = () => undefined;
    const blocker = new Promise<void>((resolve) => {
      releaseLoads = resolve;
    });
    const activeLoads = Array.from({ length: 8 }, (_, index) =>
      service.getOrLoad(`concert:detail:${index}`, 60, async () => {
        await blocker;
        return { id: index };
      }),
    );
    await new Promise<void>((resolve) => setImmediate(resolve));

    await expect(
      service.getOrLoad('concert:detail:overflow', 60, () =>
        Promise.resolve({ id: 'overflow' }),
      ),
    ).rejects.toThrow('Public read query budget exhausted');

    releaseLoads();
    await expect(Promise.all(activeLoads)).resolves.toHaveLength(8);
  });

  it('exposes Redis TTL through the cache wrapper', async () => {
    redisService.ttl.mockResolvedValue(42);

    await expect(service.ttl('concert:detail:1')).resolves.toBe(42);
  });
});
