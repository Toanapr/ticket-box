import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderRepository } from './order.repository';

@Injectable()
export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const existingOrder = await this.orderRepository.findOrderByIdempotencyKey(
      userId,
      dto.idempotencyKey,
    );

    if (existingOrder) {
      this.ensureDuplicatePayloadMatches(existingOrder, dto);
      return this.toOrderResponse(existingOrder);
    }

    try {
      const order = await this.orderRepository.createOrder(userId, dto);
      return this.toOrderResponse(order);
    } catch (error) {
      if (!this.orderRepository.isDuplicateOrderError(error)) {
        throw error;
      }

      const duplicateOrder =
        await this.orderRepository.findOrderByIdempotencyKey(
          userId,
          dto.idempotencyKey,
        );

      if (!duplicateOrder) {
        throw error;
      }

      this.ensureDuplicatePayloadMatches(duplicateOrder, dto);
      return this.toOrderResponse(duplicateOrder);
    }
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.findOrderByIdForUser(
      userId,
      orderId,
    );

    if (!order) {
      throw new DomainError('Order was not found', 'order_not_found', 404);
    }

    return this.toOrderDetailResponse(order);
  }

  private ensureDuplicatePayloadMatches(
    order: { items: Array<{ reservationId: string }> },
    dto: CreateOrderDto,
  ): void {
    const reservationIds = order.items.map((item) => item.reservationId);

    if (
      reservationIds.length !== 1 ||
      reservationIds[0] !== dto.reservationId
    ) {
      throw new DomainError(
        'Idempotency key was already used with a different order payload',
        'duplicate_request_conflict',
        409,
      );
    }
  }

  private toOrderResponse(order: {
    id: string;
    userId: string;
    status: string;
    totalAmount: { toString(): string };
    payments: Array<{
      id: string;
    }>;
    items: Array<{
      ticketTypeId: string;
      quantity: number;
      ticketType: {
        name: string;
        concertId: string;
        concert: {
          title: string;
          venue: string;
        };
      };
    }>;
  }) {
    const primaryItem = order.items[0];
    const primaryPayment = order.payments[0];
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      paymentId: primaryPayment?.id ?? null,
      concertId: primaryItem?.ticketType.concertId ?? null,
      concertTitle: primaryItem?.ticketType.concert.title ?? null,
      venue: primaryItem?.ticketType.concert.venue ?? null,
      ticketTypeId: primaryItem?.ticketTypeId ?? null,
      ticketTypeName: primaryItem?.ticketType.name ?? null,
      quantity: primaryItem?.quantity ?? null,
    };
  }

  private toOrderDetailResponse(order: {
    id: string;
    userId: string;
    status: string;
    totalAmount: { toString(): string };
    payments: Array<{
      id: string;
      provider: string;
      status: string;
      providerTxnId: string | null;
      checkoutUrl: string | null;
    }>;
    reservations: Array<{
      id: string;
      ticketTypeId: string;
      quantity: number;
      status: string;
      expiresAt: Date;
      ticketType: {
        name: string;
        concertId: string;
        concert: {
          title: string;
          venue: string;
        };
      };
    }>;
    tickets: Array<{
      id: string;
      status: string;
      sequenceNo: number;
      ticketTypeId: string;
    }>;
  }) {
    const primaryReservation = order.reservations[0];
    const primaryPayment = order.payments[0];
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      paymentId: primaryPayment?.id ?? null,
      concertId: primaryReservation?.ticketType.concertId ?? null,
      concertTitle: primaryReservation?.ticketType.concert.title ?? null,
      venue: primaryReservation?.ticketType.concert.venue ?? null,
      ticketTypeId: primaryReservation?.ticketTypeId ?? null,
      ticketTypeName: primaryReservation?.ticketType.name ?? null,
      quantity: primaryReservation?.quantity ?? null,
      payments: order.payments.map((payment) => ({
        id: payment.id,
        provider: payment.provider,
        status: payment.status,
        providerTxnId: payment.providerTxnId,
        checkoutUrl: payment.checkoutUrl,
      })),
      reservations: order.reservations.map((reservation) => ({
        id: reservation.id,
        ticketTypeId: reservation.ticketTypeId,
        quantity: reservation.quantity,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      })),
      ticketSummary: {
        count: order.tickets.length,
        issuedCount: order.tickets.filter(
          (ticket) => ticket.status === 'issued',
        ).length,
      },
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.status,
        sequenceNo: ticket.sequenceNo,
        ticketTypeId: ticket.ticketTypeId,
      })),
    };
  }
}
