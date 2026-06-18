import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  TicketStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { buildQrToken, hashQrToken } from '../../common/utils/qr-token.util';
import { PrismaService } from '../../prisma/prisma.service';

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
};

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async confirmMockPayment(userId: string, orderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.loadOrderPaymentContext(tx, orderId, 'mock');

      if (context.order.userId !== userId) {
        throw new DomainError('Order does not belong to the current user', 'order_forbidden', 403);
      }

      return this.confirmPaymentSuccess(tx, context, {
        providerTxnId: context.payment.providerTxnId ?? `mock-${context.payment.id}`,
        payloadHash: context.payment.payloadHash ?? `mock-success:${context.order.id}`,
      });
    });
  }

  async processWebhook(command: WebhookCommand) {
    return this.prisma.$transaction(async (tx) => {
      const context = await this.loadOrderPaymentContext(tx, command.orderId, command.provider);

      const isPayloadReplay =
        context.payment.payloadHash === command.payloadHash &&
        context.payment.providerTxnId === command.providerTxnId;

      if (isPayloadReplay) {
        return this.toPaymentResponse(
          context.order.id,
          context.order.status,
          context.payment.id,
          context.payment.status,
          context.payment.providerTxnId,
          context.reservation.status,
          await this.countIssuedTickets(tx, context.order.id),
        );
      }

      if (command.status === 'failed') {
        return this.markPaymentFailed(tx, context, command);
      }

      return this.confirmPaymentSuccess(tx, context, {
        providerTxnId: command.providerTxnId,
        payloadHash: command.payloadHash,
      });
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
      throw new DomainError('Payment record was not found for this order', 'payment_not_found', 404);
    }

    const reservation = order.reservations[0];
    if (!reservation) {
      throw new DomainError('Reservation linked to this order was not found', 'reservation_not_found', 404);
    }

    return { order, payment, reservation };
  }

  private async confirmPaymentSuccess(
    tx: Prisma.TransactionClient,
    context: Awaited<ReturnType<PaymentRepository['loadOrderPaymentContext']>>,
    successContext: PaymentSuccessContext,
  ) {
    const { order, payment, reservation } = context;

    if (payment.status === PaymentStatus.succeeded && order.status === OrderStatus.issued) {
      return this.toPaymentResponse(
        order.id,
        order.status,
        payment.id,
        payment.status,
        payment.providerTxnId,
        reservation.status,
        await this.countIssuedTickets(tx, order.id),
      );
    }

    if (payment.status === PaymentStatus.failed) {
      throw new DomainError('Payment is already marked as failed', 'payment_transition_invalid', 409, {
        currentStatus: payment.status,
      });
    }

    let paymentUpdate = payment;

    if (payment.status !== PaymentStatus.succeeded) {
      if (order.status !== OrderStatus.pending_payment) {
        throw new DomainError('Order is not in payable state', 'order_not_payable', 409, {
          status: order.status,
        });
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
    } else if (order.status !== OrderStatus.paid && order.status !== OrderStatus.issued) {
      throw new DomainError('Order is in an inconsistent state for ticket issuance', 'order_state_inconsistent', 409, {
        status: order.status,
      });
    }

    const issuedTicketCount = await this.issueTicketsForOrder(tx, order.id, order.userId);

    return this.toPaymentResponse(
      order.id,
      OrderStatus.issued,
      paymentUpdate.id,
      paymentUpdate.status,
      paymentUpdate.providerTxnId,
      ReservationStatus.confirmed,
      issuedTicketCount,
    );
  }

  private async markPaymentFailed(
    tx: Prisma.TransactionClient,
    context: Awaited<ReturnType<PaymentRepository['loadOrderPaymentContext']>>,
    command: WebhookCommand,
  ) {
    const { order, payment, reservation } = context;

    if (payment.status === PaymentStatus.succeeded || order.status === OrderStatus.paid) {
      throw new DomainError('Cannot move a succeeded payment back to failed', 'payment_transition_invalid', 409, {
        currentStatus: payment.status,
      });
    }

    if (payment.status === PaymentStatus.failed && payment.payloadHash === command.payloadHash) {
      return this.toPaymentResponse(
        order.id,
        order.status,
        payment.id,
        payment.status,
        payment.providerTxnId,
        reservation.status,
        await this.countIssuedTickets(tx, order.id),
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

    return this.toPaymentResponse(
      orderUpdate.id,
      orderUpdate.status,
      paymentUpdate.id,
      paymentUpdate.status,
      paymentUpdate.providerTxnId,
      reservation.status,
      await this.countIssuedTickets(tx, order.id),
    );
  }

  private async issueTicketsForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    ownerUserId: string,
  ): Promise<number> {
    const orderItems = await tx.orderItem.findMany({
      where: {
        orderId,
      },
      orderBy: {
        id: 'asc',
      },
    });

    for (const item of orderItems) {
      const existingTickets = await tx.ticket.findMany({
        where: {
          orderItemId: item.id,
        },
        select: {
          sequenceNo: true,
        },
      });

      const existingSequenceSet = new Set(existingTickets.map((ticket) => ticket.sequenceNo));

      for (let sequenceNo = 1; sequenceNo <= item.quantity; sequenceNo += 1) {
        if (existingSequenceSet.has(sequenceNo)) {
          continue;
        }

        const qrToken = buildQrToken(orderId, item.id, sequenceNo);

        await tx.ticket.create({
          data: {
            orderId,
            orderItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            ownerUserId,
            qrTokenHash: hashQrToken(qrToken),
            sequenceNo,
            status: TicketStatus.issued,
          },
        });
      }
    }

    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: OrderStatus.issued,
      },
    });

    return this.countIssuedTickets(tx, orderId);
  }

  private async countIssuedTickets(tx: Prisma.TransactionClient, orderId: string): Promise<number> {
    return tx.ticket.count({
      where: {
        orderId,
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
}
