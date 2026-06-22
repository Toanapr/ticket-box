import { Injectable, Logger } from '@nestjs/common';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { createStableHash } from '../../common/utils/hash.util';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketIssuanceService } from '../ticket/ticket-issuance.service';
import { MockPaymentSuccessDto } from './dto/mock-payment-success.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentRepository } from './payment.repository';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly cacheInvalidationService: CacheInvalidationService,
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
      payload: dto.payload ?? null,
    });

    const result = await this.paymentRepository.processWebhook({
      orderId: dto.orderId,
      provider: dto.provider ?? 'mock',
      providerTxnId: dto.providerTxnId,
      status: dto.status,
      payloadHash,
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
}
