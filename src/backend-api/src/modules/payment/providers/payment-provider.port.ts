export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type ProviderPaymentStatus =
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'not_found';

export type ProviderIntent = {
  providerIntentId: string;
  providerTxnId: string | null;
  checkoutUrl: string;
  status: ProviderPaymentStatus;
};

export interface PaymentProviderPort {
  createIntent(input: {
    provider: string;
    orderId: string;
    amount: string;
    idempotencyKey: string;
    signal: AbortSignal;
  }): Promise<ProviderIntent>;
  queryIntent(input: {
    provider: string;
    providerIntentId: string;
    orderId?: string;
    providerTxnId?: string | null;
    createdAt?: Date;
    signal: AbortSignal;
  }): Promise<{ status: ProviderPaymentStatus; providerTxnId: string | null }>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly ambiguous: boolean,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
