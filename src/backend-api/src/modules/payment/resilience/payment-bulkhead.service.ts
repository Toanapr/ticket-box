import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProviderError } from '../providers/payment-provider.port';

@Injectable()
export class PaymentBulkheadService {
  private active = 0;
  private readonly limit: number;

  constructor(config: ConfigService) {
    this.limit = this.positive(
      config.get('PAYMENT_PROVIDER_MAX_CONCURRENCY'),
      10,
    );
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      throw new PaymentProviderError(
        'Payment capacity is busy',
        'payment_bulkhead_full',
        false,
        false,
      );
    }
    this.active += 1;
    try {
      return await operation();
    } finally {
      this.active -= 1;
    }
  }

  private positive(value: unknown, fallback: number): number {
    const parsed = Number(value ?? fallback);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
