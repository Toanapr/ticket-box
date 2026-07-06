import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContext } from '../../common/context/request-context';
import { formatStructuredLog } from '../../common/logging/structured-log.util';

type ReservationRiskBody = {
  quantity?: unknown;
};

@Injectable()
export class ReservationRiskGuard implements CanActivate {
  private readonly logger = new Logger(ReservationRiskGuard.name);
  private readonly recentAttempts = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { user?: { sub?: string }; body?: ReservationRiskBody }
    >();
    const response = http.getResponse<Response>();

    const risk = this.evaluate(request);
    if (risk.score < 3) {
      return true;
    }

    response.setHeader('Retry-After', '30');
    this.logger.warn(
      formatStructuredLog('reservation_failed', {
        reason: 'risk_check_rejected',
        riskScore: risk.score,
        riskReasons: risk.reasons,
        userId: request.user?.sub ?? null,
      }),
    );
    throw new HttpException(
      {
        error: 'risk_check_rejected',
        message: 'Reservation request was rejected by risk checks.',
        retryAfterSeconds: 30,
        correlationId: RequestContext.getCorrelationId() ?? null,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private evaluate(
    request: Request & { user?: { sub?: string }; body?: ReservationRiskBody },
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const hasDeviceOrSession =
      this.headerValue(request, 'x-device-id') ||
      this.headerValue(request, 'x-session-id');
    if (!hasDeviceOrSession) {
      score += 1;
      reasons.push('missing_device_or_session');
    }

    const acceptLanguage = this.headerValue(request, 'accept-language');
    if (!acceptLanguage) {
      score += 1;
      reasons.push('missing_accept_language');
    }

    const requestBody = request.body as ReservationRiskBody | undefined;
    const quantity = Number(requestBody?.quantity ?? 0);
    if (Number.isFinite(quantity) && quantity >= 8) {
      score += 1;
      reasons.push('high_quantity');
    }

    const attemptKey = this.attemptKey(request);
    const attempts = this.recordAttempt(attemptKey);
    if (attempts >= 6) {
      score += 2;
      reasons.push('rapid_repeated_attempts');
    }

    return { score, reasons };
  }

  private recordAttempt(key: string): number {
    const now = Date.now();
    const windowStart = now - 10_000;
    const attempts = (this.recentAttempts.get(key) ?? []).filter(
      (attemptedAt) => attemptedAt >= windowStart,
    );
    attempts.push(now);
    this.recentAttempts.set(key, attempts);
    this.cleanupAttempts(now);
    return attempts.length;
  }

  private attemptKey(request: Request & { user?: { sub?: string } }): string {
    const userId = request.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    const forwardedFor = this.headerValue(request, 'x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || request.ip || 'unknown';
    return `ip:${ip}`;
  }

  private headerValue(request: Request, name: string): string | undefined {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : undefined;
  }

  private cleanupAttempts(now: number): void {
    if (this.recentAttempts.size < 1000) {
      return;
    }

    const cutoff = now - 10_000;
    for (const [key, attempts] of this.recentAttempts.entries()) {
      const freshAttempts = attempts.filter(
        (attemptedAt) => attemptedAt >= cutoff,
      );
      if (freshAttempts.length === 0) {
        this.recentAttempts.delete(key);
      } else {
        this.recentAttempts.set(key, freshAttempts);
      }
    }
  }
}
