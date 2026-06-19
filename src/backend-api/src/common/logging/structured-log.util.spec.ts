import { RequestContext } from '../context/request-context';
import { formatStructuredLog } from './structured-log.util';

describe('formatStructuredLog', () => {
  it('includes correlation context when available', () => {
    const message = RequestContext.run(
      {
        correlationId: 'corr-123',
        method: 'POST',
        path: '/payments/webhook',
        userId: 'user-1',
      },
      () =>
        formatStructuredLog('payment_webhook_processed', {
          orderId: 'order-1',
        }),
    );

    expect(JSON.parse(message)).toEqual({
      event: 'payment_webhook_processed',
      correlationId: 'corr-123',
      method: 'POST',
      path: '/payments/webhook',
      userId: 'user-1',
      orderId: 'order-1',
    });
  });

  it('falls back to null context fields outside request scope', () => {
    expect(JSON.parse(formatStructuredLog('worker_tick'))).toEqual({
      event: 'worker_tick',
      correlationId: null,
      method: null,
      path: null,
      userId: null,
    });
  });
});
