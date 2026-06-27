import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment } from '@prisma/client';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { createStableHash } from '../../common/utils/hash.util';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketIssuanceService } from '../ticket/ticket-issuance.service';
import { PaymentProviderError } from './providers/payment-provider.port';
import { PaymentRepository } from './payment.repository';
import { ResilientPaymentProvider } from './resilience/resilient-payment-provider';

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);
  private readonly batchSize: number;
  private readonly leaseMs: number;
  private readonly retryMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: ResilientPaymentProvider,
    private readonly paymentRepository: PaymentRepository,
    private readonly ticketIssuanceService: TicketIssuanceService,
    config: ConfigService,
  ) {
    this.batchSize = Number(
      config.get('PAYMENT_RECONCILIATION_BATCH_SIZE') ?? 20,
    );
    this.leaseMs = Number(
      config.get('PAYMENT_RECONCILIATION_LEASE_MS') ?? 30_000,
    );
    this.retryMs = Number(
      config.get('PAYMENT_RECONCILIATION_RETRY_MS') ?? 30_000,
    );
  }

  async runBatch(): Promise<{ claimed: number; processed: number }> {
    const owner = randomUUID();
    const claimed = await this.claimDue(owner);
    this.logger.log(
      formatStructuredLog('payment_reconciliation_started', {
        claimed: claimed.length,
      }),
    );
    let processed = 0;
    for (const payment of claimed) {
      if (await this.reconcile(payment, owner)) processed += 1;
    }
    return { claimed: claimed.length, processed };
  }

  private async claimDue(owner: string): Promise<Payment[]> {
    return this.prisma.$transaction(
      (tx) => tx.$queryRaw<Payment[]>`
      WITH due AS (
        SELECT "id" FROM "Payment"
        WHERE "status" IN ('pending'::"PaymentStatus", 'pending_reconciliation'::"PaymentStatus")
          AND "reconciliationAfter" <= NOW()
          AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt" < NOW())
        ORDER BY "reconciliationAfter" ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "Payment" p
      SET "leaseOwner" = ${owner},
          "leaseExpiresAt" = NOW() + (${this.leaseMs} * INTERVAL '1 millisecond'),
          "reconciliationAttempts" = p."reconciliationAttempts" + 1,
          "updatedAt" = NOW()
      FROM due
      WHERE p."id" = due."id"
      RETURNING p.*
    `,
    );
  }

  private async reconcile(payment: Payment, owner: string): Promise<boolean> {
    const pendingAgeSeconds = Math.floor(
      (Date.now() - (payment.uncertainSince ?? payment.updatedAt).getTime()) /
        1000,
    );
    try {
      const result = await this.provider.queryIntent({
        providerIntentId:
          payment.providerIntentId ?? payment.providerIdempotencyKey,
      });
      if (result.status === 'succeeded' || result.status === 'failed') {
        const providerTxnId =
          result.providerTxnId ?? `reconciled-${payment.id}`;
        const status = result.status;
        const finalized = await this.paymentRepository.processWebhook({
          orderId: payment.orderId,
          provider: payment.provider,
          providerTxnId,
          status,
          providerEventId: `reconciliation:${payment.id}:${status}`,
          payloadHash: createStableHash({
            paymentId: payment.id,
            status,
            providerTxnId,
          }),
        });
        if (finalized.ticketIssuedNow && finalized.ownerUserId) {
          await this.ticketIssuanceService.notifyIssuedTickets(
            finalized.response.orderId,
            finalized.ownerUserId,
            finalized.response.issuedTicketCount,
          );
        }
        this.logger.log(
          formatStructuredLog('payment_reconciliation_resolved', {
            paymentId: payment.id,
            orderId: payment.orderId,
            outcome: status,
            pendingAgeSeconds,
          }),
        );
        return true;
      }
      if (await this.expireIfOrderExpired(payment, owner)) {
        this.logger.log(
          formatStructuredLog('payment_reconciliation_resolved', {
            paymentId: payment.id,
            orderId: payment.orderId,
            outcome: 'expired',
            pendingAgeSeconds,
          }),
        );
        return true;
      }
      await this.reschedule(payment.id, owner, result.status);
      return false;
    } catch (error) {
      const code =
        error instanceof PaymentProviderError
          ? error.code
          : 'reconciliation_error';
      if (await this.expireIfOrderExpired(payment, owner)) {
        this.logger.log(
          formatStructuredLog('payment_reconciliation_resolved', {
            paymentId: payment.id,
            orderId: payment.orderId,
            outcome: 'expired',
            pendingAgeSeconds,
          }),
        );
        return true;
      }
      await this.reschedule(payment.id, owner, code);
      this.logger.warn(
        formatStructuredLog('payment_reconciliation_resolved', {
          paymentId: payment.id,
          orderId: payment.orderId,
          outcome: 'retry',
          errorCode: code,
          pendingAgeSeconds,
        }),
      );
      return false;
    }
  }

  private async expireIfOrderExpired(
    payment: Payment,
    owner: string,
  ): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      select: {
        status: true,
        reservations: { select: { status: true, expiresAt: true } },
      },
    });
    const reservation = order?.reservations[0];
    const expired =
      order?.status === 'expired' ||
      reservation?.status === 'expired' ||
      (reservation?.expiresAt ? reservation.expiresAt <= new Date() : false);
    if (!expired) return false;
    await this.prisma.payment.updateMany({
      where: { id: payment.id, leaseOwner: owner },
      data: {
        status: 'expired',
        leaseOwner: null,
        leaseExpiresAt: null,
        reconciliationAfter: null,
        lastProviderError: null,
      },
    });
    return true;
  }

  private async reschedule(paymentId: string, owner: string, reason: string) {
    await this.prisma.payment.updateMany({
      where: { id: paymentId, leaseOwner: owner },
      data: {
        status: 'pending_reconciliation',
        reconciliationAfter: new Date(Date.now() + this.retryMs),
        leaseOwner: null,
        leaseExpiresAt: null,
        lastProviderError: reason,
      },
    });
  }
}
