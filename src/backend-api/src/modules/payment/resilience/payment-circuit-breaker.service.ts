import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatStructuredLog } from '../../../common/logging/structured-log.util';
import { PaymentProviderError } from '../providers/payment-provider.port';

export type CircuitState = 'closed' | 'open' | 'half_open';

@Injectable()
export class PaymentCircuitBreakerService {
  private readonly logger = new Logger(PaymentCircuitBreakerService.name);
  private state: CircuitState = 'closed';
  private failures = 0;
  private openedAt = 0;
  private probeInFlight = false;
  private readonly threshold: number;
  private readonly cooldownMs: number;

  constructor(config: ConfigService) {
    this.threshold = Number(
      config.get('PAYMENT_CIRCUIT_FAILURE_THRESHOLD') ?? 5,
    );
    this.cooldownMs = Number(
      config.get('PAYMENT_CIRCUIT_COOLDOWN_MS') ?? 30_000,
    );
  }

  beforeCall(now = Date.now()): void {
    if (this.state === 'open' && now - this.openedAt >= this.cooldownMs) {
      this.transition('half_open');
    }
    if (
      this.state === 'open' ||
      (this.state === 'half_open' && this.probeInFlight)
    ) {
      throw new PaymentProviderError(
        'Payment provider circuit is open',
        'payment_circuit_open',
        false,
        false,
      );
    }
    if (this.state === 'half_open') this.probeInFlight = true;
  }

  success(): void {
    this.failures = 0;
    this.probeInFlight = false;
    if (this.state !== 'closed') this.transition('closed');
  }

  failure(retryable: boolean, now = Date.now()): void {
    this.probeInFlight = false;
    if (!retryable) return;
    this.failures += 1;
    if (this.state === 'half_open' || this.failures >= this.threshold) {
      this.openedAt = now;
      this.transition('open');
    }
  }

  getState(): CircuitState {
    return this.state;
  }
  getRetryAfterSeconds(): number {
    return Math.max(1, Math.ceil(this.cooldownMs / 1000));
  }

  private transition(next: CircuitState) {
    const previous = this.state;
    this.state = next;
    const eventByState: Record<CircuitState, string> = {
      closed: 'circuit_breaker_closed',
      open: 'circuit_breaker_opened',
      half_open: 'circuit_breaker_half_open',
    };
    this.logger.warn(
      formatStructuredLog(eventByState[next], {
        provider: 'mock',
        operation: 'payment_intent',
        previous,
        next,
      }),
    );
  }
}
