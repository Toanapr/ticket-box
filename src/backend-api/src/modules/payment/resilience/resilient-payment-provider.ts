import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatStructuredLog } from '../../../common/logging/structured-log.util';
import {
  PAYMENT_PROVIDER,
  PaymentProviderError,
} from '../providers/payment-provider.port';
import type { PaymentProviderPort } from '../providers/payment-provider.port';
import { PaymentBulkheadService } from './payment-bulkhead.service';
import { PaymentCircuitBreakerService } from './payment-circuit-breaker.service';

@Injectable()
export class ResilientPaymentProvider implements PaymentProviderPort {
  private readonly logger = new Logger(ResilientPaymentProvider.name);
  private readonly timeoutMs: number;

  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProviderPort,
    private readonly bulkhead: PaymentBulkheadService,
    private readonly circuit: PaymentCircuitBreakerService,
    config: ConfigService,
  ) {
    this.timeoutMs = Number(config.get('PAYMENT_PROVIDER_TIMEOUT_MS') ?? 3000);
  }

  createIntent(
    input: Omit<
      Parameters<PaymentProviderPort['createIntent']>[0],
      'signal'
    > & { signal?: AbortSignal },
  ) {
    return this.run((signal) =>
      this.provider.createIntent({ ...input, signal }),
    );
  }

  queryIntent(
    input: Omit<Parameters<PaymentProviderPort['queryIntent']>[0], 'signal'> & {
      signal?: AbortSignal;
    },
  ) {
    return this.run((signal) =>
      this.provider.queryIntent({ ...input, signal }),
    );
  }

  private async run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    this.circuit.beforeCall();
    const startedAt = Date.now();
    try {
      const result = await this.bulkhead.execute(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          return await operation(controller.signal);
        } finally {
          clearTimeout(timer);
        }
      });
      this.circuit.success();
      this.logger.log(
        formatStructuredLog('payment_provider_call', {
          outcome: 'success',
          durationMs: Date.now() - startedAt,
        }),
      );
      return result;
    } catch (error) {
      const providerError =
        error instanceof PaymentProviderError
          ? error
          : new PaymentProviderError(
              'Unexpected provider error',
              'provider_error',
              true,
              true,
            );
      this.circuit.failure(providerError.retryable);
      this.logger.warn(
        formatStructuredLog('payment_provider_call', {
          outcome: 'error',
          errorCode: providerError.code,
          durationMs: Date.now() - startedAt,
        }),
      );
      throw providerError;
    }
  }
}
