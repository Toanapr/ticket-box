export type PaymentIntentBody = {
  paymentId: string;
  orderId: string;
  status: 'pending' | 'pending_reconciliation';
  checkoutUrl: string | null;
  degraded: boolean;
  reason: 'provider_unavailable' | 'provider_timeout_ambiguous' | null;
  retryAfterSeconds: number | null;
};

export type PaymentIntentResult = {
  httpStatus: number;
  retryAfterSeconds?: number;
  body: PaymentIntentBody;
};
