import { createWebhookSignature, verifyWebhookSignature } from './webhook-signature.util';

describe('webhook signature utils', () => {
  it('generates stable signature regardless of object key order', () => {
    const left = createWebhookSignature('secret', {
      orderId: 'order-1',
      payload: {
        b: 2,
        a: 1,
      },
    });

    const right = createWebhookSignature('secret', {
      payload: {
        a: 1,
        b: 2,
      },
      orderId: 'order-1',
    });

    expect(left).toBe(right);
  });

  it('verifies valid signature and rejects invalid signature', () => {
    const payload = {
      orderId: 'order-1',
      providerTxnId: 'txn-1',
      status: 'succeeded',
    };
    const signature = createWebhookSignature('secret', payload);

    expect(verifyWebhookSignature('secret', payload, signature)).toBe(true);
    expect(verifyWebhookSignature('secret', payload, 'invalid')).toBe(false);
    expect(verifyWebhookSignature('secret', payload, undefined)).toBe(false);
  });
});
