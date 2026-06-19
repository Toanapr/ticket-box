import { Injectable } from '@nestjs/common';
import { OrderItem, OrderStatus, Prisma, Ticket } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrderItems(tx: Prisma.TransactionClient, orderId: string): Promise<OrderItem[]> {
    return tx.orderItem.findMany({
      where: {
        orderId,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findExistingSequenceSet(tx: Prisma.TransactionClient, orderItemId: string): Promise<Set<number>> {
    const existingTickets = await tx.ticket.findMany({
      where: {
        orderItemId,
      },
      select: {
        sequenceNo: true,
      },
    });

    return new Set(existingTickets.map((ticket) => ticket.sequenceNo));
  }

  async createIssuedTicket(
    tx: Prisma.TransactionClient,
    data: Pick<
      Ticket,
      | 'orderId'
      | 'orderItemId'
      | 'ticketTypeId'
      | 'ownerUserId'
      | 'qrToken'
      | 'qrTokenHash'
      | 'sequenceNo'
      | 'status'
    >,
  ) {
    return tx.ticket.create({ data });
  }

  async updateOrderStatus(tx: Prisma.TransactionClient, orderId: string, status: OrderStatus) {
    return tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
    });
  }

  async countTicketsByOrderId(tx: Prisma.TransactionClient, orderId: string): Promise<number> {
    return tx.ticket.count({
      where: {
        orderId,
      },
    });
  }

  async findTicketByIdForUser(userId: string, ticketId: string) {
    return this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        ownerUserId: userId,
      },
      include: {
        order: {
          include: {
            payments: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });
  }
}
