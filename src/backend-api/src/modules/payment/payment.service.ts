import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { createStableHash } from '../../common/utils/hash.util';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketIssuanceService } from '../ticket/ticket-issuance.service';
import { MockPaymentSuccessDto } from './dto/mock-payment-success.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentRepository } from './payment.repository';
import { createHmac } from 'crypto';

type VnpayReturnQuery = Record<string, string | string[] | undefined>;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly configService: ConfigService,
    private readonly paymentRepository: PaymentRepository,
    private readonly prisma: PrismaService,
    private readonly ticketIssuanceService: TicketIssuanceService,
  ) {}

  async mockSuccess(userId: string, dto: MockPaymentSuccessDto) {
    this.logger.log(
      formatStructuredLog('payment_mock_success_requested', {
        orderId: dto.orderId,
        userId,
      }),
    );
    const result = await this.paymentRepository.confirmMockPayment(
      userId,
      dto.orderId,
    );
    await this.invalidateInventorySummaryForOrder(result.response.orderId);
    await this.notifyIssuedTicketsIfNeeded(result);
    this.logger.log(
      formatStructuredLog('payment_mock_success_completed', {
        orderId: result.response.orderId,
        orderStatus: result.response.orderStatus,
        paymentStatus: result.response.paymentStatus,
        issuedTicketCount: result.response.issuedTicketCount,
      }),
    );
    return result.response;
  }

  async processWebhook(dto: PaymentWebhookDto) {
    const payloadHash = createStableHash({
      orderId: dto.orderId,
      provider: dto.provider ?? 'mock',
      providerTxnId: dto.providerTxnId,
      status: dto.status,
      amount: dto.amount ?? null,
      currency: dto.currency ?? null,
      payload: dto.payload ?? null,
      providerEventId: dto.providerEventId ?? null,
      eventTimestamp: dto.eventTimestamp ?? null,
    });

    const result = await this.paymentRepository.processWebhook({
      orderId: dto.orderId,
      provider: dto.provider ?? 'mock',
      providerTxnId: dto.providerTxnId,
      status: dto.status,
      amount: dto.amount ?? null,
      currency: dto.currency ?? null,
      payloadHash,
      providerEventId:
        dto.providerEventId ?? `${dto.providerTxnId}:${dto.status}`,
    });

    await this.invalidateInventorySummaryForOrder(result.response.orderId);
    await this.notifyIssuedTicketsIfNeeded(result);
    this.logger.log(
      formatStructuredLog('payment_webhook_processed', {
        orderId: result.response.orderId,
        provider: dto.provider ?? 'mock',
        providerTxnId: dto.providerTxnId,
        incomingStatus: dto.status,
        orderStatus: result.response.orderStatus,
        paymentStatus: result.response.paymentStatus,
        issuedTicketCount: result.response.issuedTicketCount,
      }),
    );
    return result.response;
  }

  async processVnpayReturn(query: VnpayReturnQuery): Promise<string> {
    const orderId = await this.processVnpayResult(query, 'return');
    return this.buildAudienceReturnUrl(orderId);
  }

  async processVnpayIpn(query: VnpayReturnQuery): Promise<void> {
    await this.processVnpayResult(query, 'ipn');
  }

  private async processVnpayResult(
    query: VnpayReturnQuery,
    source: 'return' | 'ipn',
  ): Promise<string> {
    const params = this.normalizeVnpayQuery(query);
    this.verifyVnpaySignature(params);

    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'VNPAY',
        providerIntentId: params.vnp_TxnRef,
      },
      include: {
        order: true,
      },
    });
    if (!payment) {
      throw new DomainError(
        'VNPAY payment was not found',
        'payment_not_found',
        404,
      );
    }

    const expectedAmount = Math.round(Number(payment.order.totalAmount) * 100);
    if (Number(params.vnp_Amount) !== expectedAmount) {
      throw new DomainError(
        'VNPAY amount does not match the order total',
        'payment_amount_mismatch',
        409,
      );
    }

    const providerTxnId =
      params.vnp_TransactionNo || `vnpay-${payment.providerIntentId}`;
    const status =
      params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00'
        ? 'succeeded'
        : 'failed';

    const result = await this.processWebhook({
      orderId: payment.orderId,
      provider: 'VNPAY',
      providerTxnId,
      providerEventId: `vnpay-${source}:${providerTxnId}:${params.vnp_ResponseCode}:${params.vnp_TransactionStatus}`,
      eventTimestamp: params.vnp_PayDate,
      status,
      amount: Number(params.vnp_Amount),
      currency: 'VND',
      payload: {
        eventType: `vnpay.${source}.${status}`,
      },
    });

    this.logger.log(
      formatStructuredLog('payment_vnpay_return_processed', {
        orderId: result.orderId,
        paymentStatus: result.paymentStatus,
        orderStatus: result.orderStatus,
        providerTxnId,
        source,
      }),
    );

    return payment.orderId;
  }

  private async invalidateInventorySummaryForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        reservations: {
          select: {
            ticketTypeId: true,
            ticketType: {
              select: {
                concertId: true,
              },
            },
          },
        },
        items: {
          select: {
            ticketTypeId: true,
            ticketType: {
              select: {
                concertId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return;
    }

    const affected = [
      ...order.reservations.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        concertId: item.ticketType.concertId,
      })),
      ...order.items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        concertId: item.ticketType.concertId,
      })),
    ];
    const unique = new Map(affected.map((item) => [item.ticketTypeId, item]));

    await Promise.all(
      [...unique.values()].map((item) =>
        this.cacheInvalidationService.invalidateTicketType(
          item.ticketTypeId,
          item.concertId,
        ),
      ),
    );
  }

  private async notifyIssuedTicketsIfNeeded(result: {
    response: {
      orderId: string;
      issuedTicketCount: number;
    };
    ownerUserId: string | null;
    ticketIssuedNow: boolean;
  }) {
    if (!result.ticketIssuedNow || !result.ownerUserId) {
      return;
    }

    try {
      await this.ticketIssuanceService.notifyIssuedTickets(
        result.response.orderId,
        result.ownerUserId,
        result.response.issuedTicketCount,
      );
    } catch (error) {
      this.logger.error(
        `Ticket notification hook failed for orderId=${result.response.orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private normalizeVnpayQuery(query: VnpayReturnQuery): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (!key.startsWith('vnp_')) continue;
      if (Array.isArray(value)) {
        if (typeof value[0] === 'string') params[key] = value[0];
      } else if (typeof value === 'string') {
        params[key] = value;
      }
    }
    for (const key of [
      'vnp_Amount',
      'vnp_ResponseCode',
      'vnp_SecureHash',
      'vnp_TmnCode',
      'vnp_TransactionStatus',
      'vnp_TxnRef',
    ]) {
      if (!params[key]) {
        throw new DomainError(
          'VNPAY return payload is missing required data',
          'payment_return_invalid',
          400,
          { key },
        );
      }
    }
    return params;
  }

  private verifyVnpaySignature(params: Record<string, string>): void {
    const hashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
    if (!hashSecret?.trim() || !tmnCode?.trim()) {
      throw new DomainError(
        'VNPAY configuration is missing',
        'payment_provider_not_configured',
        500,
      );
    }
    if (params.vnp_TmnCode !== tmnCode) {
      throw new DomainError(
        'VNPAY terminal code does not match configuration',
        'payment_return_invalid',
        400,
      );
    }

    const receivedHash = params.vnp_SecureHash;
    const signedData = Object.keys(params)
      .filter((key) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
      .sort()
      .map((key) => `${vnpayEncode(key)}=${vnpayEncode(params[key])}`)
      .join('&');
    const expectedHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signedData, 'utf-8'))
      .digest('hex');

    if (receivedHash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new DomainError(
        'VNPAY return signature is invalid',
        'payment_return_invalid_signature',
        400,
      );
    }
  }

  private buildAudienceReturnUrl(orderId: string): string {
    const audienceReturnUrl =
      this.configService.get<string>('VNPAY_AUDIENCE_RETURN_URL') ??
      'http://localhost:3001/orders';
    const base = audienceReturnUrl.replace(/\/$/, '');
    return `${base}/${encodeURIComponent(orderId)}?paymentReturn=1`;
  }
}

function vnpayEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}
