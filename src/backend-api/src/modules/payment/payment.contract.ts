export type PaymentIntentBody = {
  paymentId: string;
  orderId: string;
  orderStatus: string;
  status:
    | 'created'
    | 'pending'
    | 'pending_reconciliation'
    | 'succeeded'
    | 'failed'
    | 'expired';
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
