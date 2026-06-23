import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../common/errors/domain-error';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { createStableHash } from '../../common/utils/hash.util';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentIntentResult } from './payment.contract';
import { PaymentProviderError } from './providers/payment-provider.port';
import { ResilientPaymentProvider } from './resilience/resilient-payment-provider';

@Injectable()
export class PaymentIntentService {
  private readonly logger = new Logger(PaymentIntentService.name);
  private readonly pendingAgeMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly provider: ResilientPaymentProvider,
    config: ConfigService,
  ) {
    this.pendingAgeMs = Number(
      config.get('PAYMENT_PENDING_RECONCILIATION_AGE_MS') ?? 60_000,
    );
  }

  async create(
    userId: string,
    paymentId: string,
    idempotencyKey: string,
  ): Promise<PaymentIntentResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { userId } },
      include: { order: true },
    });
    if (!payment) {
      throw new DomainError('Payment was not found', 'payment_not_found', 404);
    }
    if (payment.providerIntentId && payment.checkoutUrl) {
      return { httpStatus: 200, body: this.toBody(payment, false, null, null) };
    }

    const claim = await this.idempotency.claim({
      userId,
      endpoint: 'POST:/payments/:paymentId/intent',
      key: idempotencyKey,
      requestHash: createStableHash({ paymentId }),
      resourceId: payment.id,
    });
    if (claim.kind === 'replay') {
      return {
        httpStatus: claim.statusCode,
        body: claim.body as unknown as PaymentIntentResult['body'],
      };
    }
    if (claim.kind === 'processing') {
      const current = await this.prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      return {
        httpStatus: 202,
        body: this.toBody(current, true, 'provider_timeout_ambiguous', 5),
      };
    }

    await this.idempotency.markProviderDispatched(claim.recordId, claim.owner);
    try {
      const intent = await this.provider.createIntent({
        orderId: payment.orderId,
        amount: payment.order.totalAmount.toString(),
        idempotencyKey: payment.providerIdempotencyKey,
      });
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerIntentId: intent.providerIntentId,
          providerTxnId: intent.providerTxnId,
          checkoutUrl: intent.checkoutUrl,
          status: 'pending',
          reconciliationAfter: new Date(Date.now() + this.pendingAgeMs),
          lastProviderAttemptAt: new Date(),
          lastProviderError: null,
        },
      });
      const body = this.toBody(updated, false, null, null);
      await this.idempotency.complete(claim.recordId, claim.owner, 201, body);
      return { httpStatus: 201, body };
    } catch (error) {
      return this.handleProviderError(error, payment, claim);
    }
  }

  private async handleProviderError(
    error: unknown,
    payment: {
      id: string;
      orderId: string;
      status: string;
      checkoutUrl: string | null;
      uncertainSince: Date | null;
    },
    claim: { recordId: string; owner: string },
  ): Promise<PaymentIntentResult> {
    const providerError = error as PaymentProviderError;
    if (
      ['payment_circuit_open', 'payment_bulkhead_full'].includes(
        providerError.code,
      )
    ) {
      await this.idempotency.releaseUndispatched(claim.recordId, claim.owner);
      return {
        httpStatus: 503,
        retryAfterSeconds: 30,
        body: this.toBody(payment, true, 'provider_unavailable', 30),
      };
    }
    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'pending_reconciliation',
        uncertainSince: payment.uncertainSince ?? new Date(),
        reconciliationAfter: new Date(Date.now() + 5_000),
        lastProviderAttemptAt: new Date(),
        lastProviderError: providerError.code ?? 'provider_error',
      },
    });
    const body = this.toBody(updated, true, 'provider_timeout_ambiguous', 5);
    await this.idempotency.complete(claim.recordId, claim.owner, 202, body);
    this.logger.warn(
      formatStructuredLog('payment_pending_reconciliation', {
        paymentId: payment.id,
        orderId: payment.orderId,
      }),
    );
    return { httpStatus: 202, body };
  }

  private toBody(
    payment: {
      id: string;
      orderId: string;
      status: string;
      checkoutUrl: string | null;
    },
    degraded: boolean,
    reason: 'provider_unavailable' | 'provider_timeout_ambiguous' | null,
    retryAfterSeconds: number | null,
  ): PaymentIntentResult['body'] {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      status:
        payment.status === 'pending_reconciliation'
          ? 'pending_reconciliation'
          : 'pending',
      checkoutUrl: payment.checkoutUrl,
      degraded,
      reason,
      retryAfterSeconds,
    };
  }
}
