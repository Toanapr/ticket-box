import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProviderError,
  PaymentProviderPort,
  ProviderIntent,
  ProviderPaymentStatus,
} from './payment-provider.port';

@Injectable()
export class MockPaymentProvider implements PaymentProviderPort {
  private readonly intents = new Map<string, ProviderIntent>();
  private readonly inFlight = new Map<string, Promise<ProviderIntent>>();

  constructor(private readonly config: ConfigService) {}

  async createIntent(input: {
    orderId: string;
    amount: string;
    idempotencyKey: string;
    signal: AbortSignal;
  }): Promise<ProviderIntent> {
    const existing = this.intents.get(input.idempotencyKey);
    if (existing) return existing;
    const pending = this.inFlight.get(input.idempotencyKey);
    if (pending) return pending;
    const operation = this.createNewIntent(input);
    this.inFlight.set(input.idempotencyKey, operation);
    try {
      return await operation;
    } finally {
      this.inFlight.delete(input.idempotencyKey);
    }
  }

  private async createNewIntent(input: {
    idempotencyKey: string;
    signal: AbortSignal;
  }): Promise<ProviderIntent> {
    await this.simulate(input.signal);
    const providerIntentId = `mock-intent-${randomUUID()}`;
    const intent: ProviderIntent = {
      providerIntentId,
      providerTxnId: null,
      checkoutUrl: `https://mock-payment.local/checkout/${providerIntentId}`,
      status: 'pending',
    };
    this.intents.set(input.idempotencyKey, intent);
    return intent;
  }

  async queryIntent(input: { providerIntentId: string; signal: AbortSignal }) {
    await this.simulate(input.signal);
    const intent = [...this.intents.values()].find(
      (item) => item.providerIntentId === input.providerIntentId,
    );
    const configured = this.config.get<string>('MOCK_PAYMENT_QUERY_STATUS');
    const status = (configured ??
      intent?.status ??
      'not_found') as ProviderPaymentStatus;
    return { status, providerTxnId: intent?.providerTxnId ?? null };
  }

  private async simulate(signal: AbortSignal): Promise<void> {
    const mode = this.config.get<string>('MOCK_PAYMENT_MODE') ?? 'success';
    if (mode === 'error') {
      throw new PaymentProviderError(
        'Mock provider unavailable',
        'provider_error',
        false,
        true,
      );
    }
    const delayMs = Number(
      this.config.get<string>('MOCK_PAYMENT_DELAY_MS') ?? '0',
    );
    if (mode === 'timeout' || delayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          resolve,
          mode === 'timeout' ? 60_000 : delayMs,
        );
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(
              new PaymentProviderError(
                'Provider call timed out',
                'provider_timeout',
                true,
                true,
              ),
            );
          },
          { once: true },
        );
      });
    }
  }
}
