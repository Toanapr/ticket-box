import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConcertsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublishedUpcoming() {
    const concerts = await this.prisma.concert.findMany({
      where: {
        status: 'published',
        startAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        startAt: 'asc',
      },
      include: {
        ticketTypes: {
          include: {
            inventory: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    return concerts.map((concert) => ({
      ...concert,
      ticketTypes: concert.ticketTypes.map((ticketType) => ({
        ...ticketType,
        availableCount: ticketType.inventory
          ? ticketType.inventory.totalCapacity -
            ticketType.inventory.reservedCount -
            ticketType.inventory.soldCount
          : 0,
      })),
    }));
  }

  async getPublishedDetail(id: string) {
    const concert = await this.prisma.concert.findFirst({
      where: {
        id,
        status: 'published',
      },
      include: {
        ticketTypes: {
          include: {
            inventory: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    return {
      ...concert,
      ticketTypes: concert.ticketTypes.map((ticketType) => ({
        ...ticketType,
        availableCount: ticketType.inventory
          ? ticketType.inventory.totalCapacity -
            ticketType.inventory.reservedCount -
            ticketType.inventory.soldCount
          : 0,
      })),
    };
  }
}
