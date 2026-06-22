import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import { RateLimitGuard } from './rate-limit.guard';

function createContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = {
    method: 'POST',
    path: '/reservations',
    route: { path: '/reservations' },
    headers,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };
  const response = {
    setHeader: jest.fn(),
  };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as jest.Mocked<Reflector>;

  let cacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    reflector.getAllAndOverride.mockReturnValue([
      { scope: 'ip', limit: 1, windowSeconds: 60 },
    ]);
    cacheService = {
      incrementCounter: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;
  });

  it('returns 429 with Retry-After when the Redis counter exceeds the limit', async () => {
    cacheService.incrementCounter.mockResolvedValue({
      count: 2,
      retryAfterSeconds: 30,
      redisAvailable: true,
    });
    const guard = new RateLimitGuard(reflector, cacheService);
    const context = createContext();
    const response = context.switchToHttp().getResponse();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '30');
  });

  it('keeps limiting locally when Redis is unavailable', async () => {
    cacheService.incrementCounter.mockResolvedValue({
      count: -1,
      retryAfterSeconds: 60,
      redisAvailable: false,
    });
    const guard = new RateLimitGuard(reflector, cacheService);
    const context = createContext({ 'x-forwarded-for': '203.0.113.10' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });
  });
});