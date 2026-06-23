import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RequestContext } from '../context/request-context';
import { formatStructuredLog } from '../logging/structured-log.util';
import { CacheService } from './cache.service';
import {
  RATE_LIMIT_RULES,
  RateLimitRule,
  RateLimitScope,
} from './rate-limit.constants';
import { JwtService } from '../../modules/auth/jwt.service';

type LocalCounter = {
  count: number;
  expiresAt: number;
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly localCounters = new Map<string, LocalCounter>();

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.getAllAndOverride<RateLimitRule[]>(
      RATE_LIMIT_RULES,
      [context.getHandler(), context.getClass()],
    );

    if (!rules || rules.length === 0) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { sub?: string } }>();
    const response = http.getResponse<Response>();
    const endpoint = `${request.method}:${request.route?.path ?? request.path}`;

    for (const rule of rules) {
      const identifier = this.resolveIdentifier(rule.scope, request);
      if (!identifier) {
        continue;
      }

      const window = Math.floor(Date.now() / (rule.windowSeconds * 1000));
      const key = `rate:${rule.scope}:${identifier}:${endpoint}:${window}`;
      const counter = await this.increment(key, rule.windowSeconds);

      if (counter.count > rule.limit) {
        response.setHeader('Retry-After', String(counter.retryAfterSeconds));
        this.logger.warn(
          formatStructuredLog('rate_limit_rejected', {
            correlationId: RequestContext.getCorrelationId() ?? null,
            endpoint,
            scope: rule.scope,
            identifier,
            limit: rule.limit,
            windowSeconds: rule.windowSeconds,
            retryAfterSeconds: counter.retryAfterSeconds,
            backend: counter.redisAvailable ? 'redis' : 'local',
          }),
        );
        throw new HttpException(
          {
            error: 'rate_limited',
            message: 'Too many requests. Please retry later.',
            retryAfterSeconds: counter.retryAfterSeconds,
            correlationId: RequestContext.getCorrelationId() ?? null,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  private async increment(key: string, windowSeconds: number) {
    const redisCounter = await this.cacheService.incrementCounter(
      key,
      windowSeconds,
    );
    if (redisCounter.redisAvailable) {
      return redisCounter;
    }

    const now = Date.now();
    const existing = this.localCounters.get(key);
    if (!existing || existing.expiresAt <= now) {
      const next = { count: 1, expiresAt: now + windowSeconds * 1000 };
      this.localCounters.set(key, next);
      this.cleanupLocalCounters(now);
      return {
        count: next.count,
        retryAfterSeconds: windowSeconds,
        redisAvailable: false,
      };
    }

    existing.count += 1;
    return {
      count: existing.count,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.expiresAt - now) / 1000),
      ),
      redisAvailable: false,
    };
  }

  private resolveIdentifier(
    scope: RateLimitScope,
    request: Request & { user?: { sub?: string } },
  ) {
    if (scope === 'ip') {
      const forwardedFor = request.headers['x-forwarded-for'];
      return Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor?.split(',')[0]?.trim() ||
            request.ip ||
            request.socket.remoteAddress;
    }

    if (scope === 'user') {
      if (request.user?.sub) {
        return request.user.sub;
      }

      const authorization = request.headers.authorization;
      if (!authorization?.startsWith('Bearer ')) {
        return undefined;
      }

      return this.jwtService.verify(authorization.slice('Bearer '.length)).sub;
    }

    const deviceHeader =
      request.headers['x-device-id'] ?? request.headers['x-session-id'];
    return Array.isArray(deviceHeader) ? deviceHeader[0] : deviceHeader;
  }

  private cleanupLocalCounters(now: number): void {
    if (this.localCounters.size < 1000) {
      return;
    }

    for (const [key, value] of this.localCounters.entries()) {
      if (value.expiresAt <= now) {
        this.localCounters.delete(key);
      }
    }
  }
}
