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
      order_id: 'order-1',
      orderId: 'order-1',
    });
  });

  it('adds snake_case business id aliases and redacts sensitive fields', () => {
    expect(
      JSON.parse(
        formatStructuredLog('ticket_issued', {
          paymentId: 'payment-1',
          reservationId: 'reservation-1',
          qrToken: 'raw-qr-token',
          paymentSecret: 'secret',
        }),
      ),
    ).toEqual({
      event: 'ticket_issued',
      correlationId: null,
      method: null,
      path: null,
      userId: null,
      payment_id: 'payment-1',
      reservation_id: 'reservation-1',
      paymentId: 'payment-1',
      reservationId: 'reservation-1',
      qrToken: '[redacted]',
      paymentSecret: '[redacted]',
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
