import { Injectable } from '@nestjs/common';
import {
  PaymentProviderError,
  PaymentProviderPort,
} from './payment-provider.port';
import { MockPaymentProvider } from './mock-payment-provider';
import { VnpayPaymentProvider } from './vnpay-payment-provider';

@Injectable()
export class DelegatingPaymentProvider implements PaymentProviderPort {
  constructor(
    private readonly mock: MockPaymentProvider,
    private readonly vnpay: VnpayPaymentProvider,
  ) {}

  createIntent(input: Parameters<PaymentProviderPort['createIntent']>[0]) {
    return this.providerFor(input.provider).createIntent(input);
  }

  queryIntent(input: Parameters<PaymentProviderPort['queryIntent']>[0]) {
    return this.providerFor(input.provider).queryIntent(input);
  }

  private providerFor(provider: string): PaymentProviderPort {
    if (provider === 'VNPAY') return this.vnpay;
    if (provider === 'mock') return this.mock;
    throw new PaymentProviderError(
      `Payment provider ${provider} is not supported`,
      'provider_not_supported',
      false,
      false,
    );
  }
}
