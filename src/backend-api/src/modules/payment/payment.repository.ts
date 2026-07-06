import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketIssuanceService } from '../ticket/ticket-issuance.service';

type PaymentSuccessContext = {
  providerTxnId: string;
  payloadHash: string;
};

type WebhookCommand = {
  orderId: string;
  provider: string;
  providerTxnId: string;
  status: 'succeeded' | 'failed';
  payloadHash: string;
  providerEventId: string;
};

@Injectable()
export class PaymentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketIssuanceService: TicketIssuanceService,
  ) {}

  async confirmMockPayment(userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.loadOrderPaymentContext(tx, orderId, 'mock');

      if (context.order.userId !== userId) {
        throw new DomainError(
          'Order does not belong to the current user',
          'order_forbidden',
          403,
        );
      }

      return this.confirmPaymentSuccess(tx, context, {
        providerTxnId:
          context.payment.providerTxnId ?? `mock-${context.payment.id}`,
        payloadHash:
          context.payment.payloadHash ?? `mock-success:${context.order.id}`,
      });
    });
  }

  async processWebhook(command: WebhookCommand) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`${command.provider}:${command.providerEventId}`})
        ) IS NULL AS "locked"
      `;
      const existingEvent = await tx.paymentProviderEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: command.provider,
            providerEventId: command.providerEventId,
          },
        },
      });
      if (existingEvent && existingEvent.payloadHash !== command.payloadHash) {
        throw new DomainError(
          'Provider event id was replayed with different payload',
          'provider_event_conflict',
          409,
        );
      }

      await tx.$queryRaw`
        SELECT "id" FROM "Order"
        WHERE "id" = ${command.orderId}::uuid
        FOR UPDATE
      `;
      await tx.$queryRaw`
        SELECT "id" FROM "Payment"
        WHERE "orderId" = ${command.orderId}::uuid
          AND "provider" = ${command.provider}
        FOR UPDATE
      `;

      const event =
        existingEvent ??
        (await tx.paymentProviderEvent.create({
          data: {
            provider: command.provider,
            providerEventId: command.providerEventId,
            providerTxnId: command.providerTxnId,
            orderId: command.orderId,
            payloadHash: command.payloadHash,
            status: 'processing',
          },
        }));
      const context = await this.loadOrderPaymentContext(
        tx,
        command.orderId,
        command.provider,
      );

      const isPayloadReplay =
        context.payment.payloadHash === command.payloadHash &&
        context.payment.providerTxnId === command.providerTxnId;

      if (isPayloadReplay) {
        const replay = this.toRepositoryResult(
          this.toPaymentResponse(
            context.order.id,
            context.order.status,
            context.payment.id,
            context.payment.status,
            context.payment.providerTxnId,
            context.reservation.status,
            await this.countIssuedTickets(tx, context.order.id),
          ),
          context.order.userId,
          false,
        );
        await this.finishProviderEvent(tx, event.id, replay.response);
        return replay;
      }

      if (command.status === 'failed') {
        const result = await this.markPaymentFailed(tx, context, command);
        await this.finishProviderEvent(tx, event.id, result.response);
        return result;
      }

      const result = await this.confirmPaymentSuccess(tx, context, {
        providerTxnId: command.providerTxnId,
        payloadHash: command.payloadHash,
      });
      await this.finishProviderEvent(tx, event.id, result.response);
      return result;
    });
  }

  private async finishProviderEvent(
    tx: Prisma.TransactionClient,
    eventId: string,
    response: Record<string, unknown>,
  ) {
    await tx.paymentProviderEvent.update({
      where: { id: eventId },
      data: {
        status: 'processed',
        responseBody: response as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
  }

  private async loadOrderPaymentContext(
    tx: Prisma.TransactionClient,
    orderId: string,
    provider: string,
  ) {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        payments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        reservations: true,
        items: true,
      },
    });

    if (!order) {
      throw new DomainError('Order was not found', 'order_not_found', 404);
    }

    const payment = order.payments.find((item) => item.provider === provider);
    if (!payment) {
      throw new DomainError(
        'Payment record was not found for this order',
        'payment_not_found',
        404,
      );
    }

    const reservation = order.reservations[0];
    if (!reservation) {
      throw new DomainError(
        'Reservation linked to this order was not found',
        'reservation_not_found',
        404,
      );
    }

    return { order, payment, reservation };
  }

  private async confirmPaymentSuccess(
    tx: Prisma.TransactionClient,
    context: Awaited<ReturnType<PaymentRepository['loadOrderPaymentContext']>>,
    successContext: PaymentSuccessContext,
  ) {
    const { order, payment, reservation } = context;

    if (
      payment.status === PaymentStatus.succeeded &&
      order.status === OrderStatus.issued
    ) {
      return this.toRepositoryResult(
        this.toPaymentResponse(
          order.id,
          order.status,
          payment.id,
          payment.status,
          payment.providerTxnId,
          reservation.status,
          await this.countIssuedTickets(tx, order.id),
        ),
        order.userId,
        false,
      );
    }

    if (
      payment.status === PaymentStatus.succeeded &&
      order.status === OrderStatus.refund_required
    ) {
      return this.toRepositoryResult(
        this.toPaymentResponse(
          order.id,
          order.status,
          payment.id,
          payment.status,
          payment.providerTxnId,
          reservation.status,
          await this.countIssuedTickets(tx, order.id),
        ),
        order.userId,
        false,
      );
    }

    if (payment.status === PaymentStatus.failed) {
      throw new DomainError(
        'Payment is already marked as failed',
        'payment_transition_invalid',
        409,
        {
          currentStatus: payment.status,
        },
      );
    }

    let paymentUpdate = payment;

    if (payment.status !== PaymentStatus.succeeded) {
      if (this.shouldMarkRefundRequired(order.status, reservation)) {
        const paymentSuccess = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.succeeded,
            providerTxnId: successContext.providerTxnId,
            payloadHash: successContext.payloadHash,
          },
        });

        await this.releaseExpiredReservationIfStillHeld(
          tx,
          reservation,
          order.userId,
        );

        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: OrderStatus.refund_required,
          },
        });

        return this.toRepositoryResult(
          this.toPaymentResponse(
            order.id,
            OrderStatus.refund_required,
            paymentSuccess.id,
            paymentSuccess.status,
            paymentSuccess.providerTxnId,
            ReservationStatus.expired,
            await this.countIssuedTickets(tx, order.id),
          ),
          order.userId,
          false,
        );
      }

      if (order.status !== OrderStatus.pending_payment) {
        throw new DomainError(
          'Order is not in payable state',
          'order_not_payable',
          409,
          {
            status: order.status,
          },
        );
      }

      if (reservation.status !== ReservationStatus.active) {
        throw new DomainError(
          'Reservation is no longer active for payment confirmation',
          'reservation_not_active_for_payment',
          409,
          { status: reservation.status },
        );
      }

      if (reservation.expiresAt <= new Date()) {
        throw new DomainError(
          'Reservation expired before payment confirmation',
          'reservation_expired_for_payment',
          409,
        );
      }

      paymentUpdate = await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.succeeded,
          providerTxnId: successContext.providerTxnId,
          payloadHash: successContext.payloadHash,
        },
      });

      await tx.reservation.update({
        where: {
          id: reservation.id,
        },
        data: {
          status: ReservationStatus.confirmed,
        },
      });

      await tx.inventoryCounter.update({
        where: {
          ticketTypeId: reservation.ticketTypeId,
        },
        data: {
          reservedCount: {
            decrement: reservation.quantity,
          },
          soldCount: {
            increment: reservation.quantity,
          },
        },
      });

      await tx.userTicketQuota.update({
        where: {
          userId_ticketTypeId: {
            userId: order.userId,
            ticketTypeId: reservation.ticketTypeId,
          },
        },
        data: {
          reservedCount: {
            decrement: reservation.quantity,
          },
          paidCount: {
            increment: reservation.quantity,
          },
        },
      });
    } else if (
      order.status !== OrderStatus.paid &&
      order.status !== OrderStatus.issued
    ) {
      throw new DomainError(
        'Order is in an inconsistent state for ticket issuance',
        'order_state_inconsistent',
        409,
        {
          status: order.status,
        },
      );
    }

    const issuance = await this.ticketIssuanceService.issueTicketsForOrder(
      tx,
      order.id,
      order.userId,
    );

    return this.toRepositoryResult(
      this.toPaymentResponse(
        order.id,
        OrderStatus.issued,
        paymentUpdate.id,
        paymentUpdate.status,
        paymentUpdate.providerTxnId,
        ReservationStatus.confirmed,
        issuance.issuedTicketCount,
      ),
      order.userId,
      issuance.createdNow,
    );
  }

  private async markPaymentFailed(
    tx: Prisma.TransactionClient,
    context: Awaited<ReturnType<PaymentRepository['loadOrderPaymentContext']>>,
    command: WebhookCommand,
  ) {
    const { order, payment, reservation } = context;

    if (
      payment.status === PaymentStatus.succeeded ||
      order.status === OrderStatus.paid
    ) {
      throw new DomainError(
        'Cannot move a succeeded payment back to failed',
        'payment_transition_invalid',
        409,
        {
          currentStatus: payment.status,
        },
      );
    }

    if (
      payment.status === PaymentStatus.failed &&
      payment.payloadHash === command.payloadHash
    ) {
      return this.toRepositoryResult(
        this.toPaymentResponse(
          order.id,
          order.status,
          payment.id,
          payment.status,
          payment.providerTxnId,
          reservation.status,
          await this.countIssuedTickets(tx, order.id),
        ),
        order.userId,
        false,
      );
    }

    const paymentUpdate = await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: PaymentStatus.failed,
        providerTxnId: command.providerTxnId,
        payloadHash: command.payloadHash,
      },
    });

    const orderUpdate = await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.failed,
      },
    });

    return this.toRepositoryResult(
      this.toPaymentResponse(
        orderUpdate.id,
        orderUpdate.status,
        paymentUpdate.id,
        paymentUpdate.status,
        paymentUpdate.providerTxnId,
        reservation.status,
        await this.countIssuedTickets(tx, order.id),
      ),
      order.userId,
      false,
    );
  }

  private async countIssuedTickets(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<number> {
    return tx.ticket.count({
      where: {
        orderId,
      },
    });
  }

  private shouldMarkRefundRequired(
    orderStatus: OrderStatus,
    reservation: { status: ReservationStatus; expiresAt: Date },
  ): boolean {
    return (
      orderStatus === OrderStatus.expired ||
      reservation.status === ReservationStatus.expired ||
      reservation.expiresAt <= new Date()
    );
  }

  private async releaseExpiredReservationIfStillHeld(
    tx: Prisma.TransactionClient,
    reservation: {
      id: string;
      userId: string;
      ticketTypeId: string;
      quantity: number;
      status: ReservationStatus;
    },
    orderUserId: string,
  ): Promise<void> {
    if (reservation.status !== ReservationStatus.active) {
      return;
    }

    await tx.reservation.update({
      where: {
        id: reservation.id,
      },
      data: {
        status: ReservationStatus.expired,
      },
    });

    await tx.inventoryCounter.update({
      where: {
        ticketTypeId: reservation.ticketTypeId,
      },
      data: {
        reservedCount: {
          decrement: reservation.quantity,
        },
      },
    });

    await tx.userTicketQuota.update({
      where: {
        userId_ticketTypeId: {
          userId: orderUserId,
          ticketTypeId: reservation.ticketTypeId,
        },
      },
      data: {
        reservedCount: {
          decrement: reservation.quantity,
        },
      },
    });
  }

  private toPaymentResponse(
    orderId: string,
    orderStatus: OrderStatus,
    paymentId: string,
    paymentStatus: PaymentStatus,
    providerTxnId: string | null,
    reservationStatus: ReservationStatus,
    issuedTicketCount: number,
  ) {
    return {
      orderId,
      orderStatus,
      paymentId,
      paymentStatus,
      providerTxnId,
      reservationStatus,
      issuedTicketCount,
    };
  }

  private toRepositoryResult(
    response: ReturnType<PaymentRepository['toPaymentResponse']>,
    ownerUserId: string | null,
    ticketIssuedNow: boolean,
  ) {
    return {
      response,
      ownerUserId,
      ticketIssuedNow,
    };
  }
}
