import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketRepository {
  constructor(private readonly prisma: PrismaService) {}

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
