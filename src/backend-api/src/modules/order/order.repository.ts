import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

const orderSummaryInclude = {
  payments: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  items: {
    orderBy: {
      id: 'asc' as const,
    },
    include: {
      ticketType: {
        include: {
          concert: true,
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

const orderDetailInclude = {
  payments: {
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  reservations: {
    include: {
      ticketType: {
        include: {
          concert: true,
        },
      },
    },
  },
  tickets: {
    orderBy: {
      sequenceNo: 'asc' as const,
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrderByIdempotencyKey(userId: string, idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
      include: {
        ...orderSummaryInclude,
      },
    });
  }

  async findOrderByIdForUser(userId: string, orderId: string) {
    return this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: orderDetailInclude,
    });
  }

  isDuplicateOrderError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: {
          id: dto.reservationId,
        },
        include: {
          ticketType: true,
        },
      });

      if (!reservation) {
        throw new DomainError(
          'Reservation was not found',
          'reservation_not_found',
          404,
        );
      }

      if (reservation.userId !== userId) {
        throw new DomainError(
          'Reservation does not belong to the current user',
          'reservation_forbidden',
          403,
        );
      }

      if (reservation.status !== ReservationStatus.active) {
        throw new DomainError(
          'Reservation is not active',
          'reservation_not_active',
          409,
        );
      }

      const now = new Date();
      if (reservation.expiresAt <= now) {
        throw new DomainError(
          'Reservation has expired',
          'reservation_expired',
          409,
        );
      }

      if (reservation.orderId) {
        throw new DomainError(
          'Reservation is already linked to an order',
          'reservation_already_ordered',
          409,
          { orderId: reservation.orderId },
        );
      }

      const totalAmountDecimal = reservation.ticketType.price.mul(
        reservation.quantity,
      );

      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.pending_payment,
          totalAmount: totalAmountDecimal,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          reservationId: reservation.id,
          ticketTypeId: reservation.ticketTypeId,
          quantity: reservation.quantity,
          unitPrice: reservation.ticketType.price,
          subtotalAmount: totalAmountDecimal,
          status: 'pending',
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: dto.paymentMethod ?? 'mock',
          status: PaymentStatus.created,
          providerIdempotencyKey: `payment:${order.id}:${dto.paymentMethod ?? 'mock'}`,
        },
      });

      await tx.reservation.update({
        where: {
          id: reservation.id,
        },
        data: {
          orderId: order.id,
        },
      });

      return tx.order.findUniqueOrThrow({
        where: {
          id: order.id,
        },
        include: orderSummaryInclude,
      });
    });
  }
}
