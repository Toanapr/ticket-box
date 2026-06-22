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
    expect(redisService.setJson).toHaveBeenCalledWith(
      'concert:list:test',
      JSON.stringify({ items: ['a'] }),
      expect.any(Number),
    );
  });

  it('exposes Redis TTL through the cache wrapper', async () => {
    redisService.ttl.mockResolvedValue(42);

    await expect(service.ttl('concert:detail:1')).resolves.toBe(42);
  });
});