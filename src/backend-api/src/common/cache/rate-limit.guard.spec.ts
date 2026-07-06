import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import { RateLimitGuard } from './rate-limit.guard';
import { JwtService } from '../../modules/auth/jwt.service';

function createContext(
  headers: Record<string, string> = {},
  user?: { sub: string },
): ExecutionContext {
  const request = {
    method: 'POST',
    path: '/reservations',
    route: { path: '/reservations' },
    headers,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    user,
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
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    reflector.getAllAndOverride.mockReturnValue([
      { scope: 'ip', limit: 1, windowSeconds: 60 },
    ]);
    cacheService = {
      incrementCounter: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;
  });

  it('returns 429 with Retry-After when the Redis counter exceeds the limit', async () => {
    cacheService.incrementCounter.mockResolvedValue({
      count: 2,
      retryAfterSeconds: 30,
      redisAvailable: true,
    });
    const guard = new RateLimitGuard(reflector, cacheService, jwtService);
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
    const guard = new RateLimitGuard(reflector, cacheService, jwtService);
    const context = createContext({ 'x-forwarded-for': '203.0.113.10' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: 429,
    });
  });

  it('does not trust x-user-id as the user rate-limit identity', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { scope: 'user', limit: 1, windowSeconds: 60 },
    ]);
    const guard = new RateLimitGuard(reflector, cacheService, jwtService);

    await expect(
      guard.canActivate(createContext({ 'x-user-id': 'spoofed-user' })),
    ).resolves.toBe(true);
    expect(cacheService.incrementCounter.mock.calls).toHaveLength(0);

    cacheService.incrementCounter.mockResolvedValue({
      count: 1,
      retryAfterSeconds: 60,
      redisAvailable: true,
    });
    await expect(
      guard.canActivate(createContext({}, { sub: 'authenticated-user' })),
    ).resolves.toBe(true);
    expect(cacheService.incrementCounter.mock.calls).toEqual([
      [expect.stringContaining('authenticated-user'), 60],
    ]);
  });

  it('uses a verified bearer subject before the controller auth guard runs', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { scope: 'user', limit: 1, windowSeconds: 60 },
    ]);
    jwtService.verify.mockReturnValue({
      sub: 'bearer-user',
      email: 'audience@test.local',
      role: 'audience',
      organizationId: null,
      iss: 'test',
      iat: 1,
      exp: 2,
    });
    cacheService.incrementCounter.mockResolvedValue({
      count: 1,
      retryAfterSeconds: 60,
      redisAvailable: true,
    });
    const guard = new RateLimitGuard(reflector, cacheService, jwtService);

    await expect(
      guard.canActivate(
        createContext({ authorization: 'Bearer signed-token' }),
      ),
    ).resolves.toBe(true);
    expect(jwtService.verify.mock.calls).toEqual([['signed-token']]);
    expect(cacheService.incrementCounter.mock.calls).toEqual([
      [expect.stringContaining('bearer-user'), 60],
    ]);
  });
});
