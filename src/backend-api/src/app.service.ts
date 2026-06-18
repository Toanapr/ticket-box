import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type ConcertStatus = 'draft' | 'published';

export type TicketType = {
  id: string;
  concertId: string;
  zoneCode: string;
  price: number;
  capacity: number;
  saleStartsAt: string;
  saleEndsAt: string;
  perUserLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type Concert = {
  id: string;
  organizationId: string;
  title: string;
  venue: string;
  startsAt: string;
  status: ConcertStatus;
  ticketTypes: TicketType[];
  createdAt: string;
  updatedAt: string;
};

type ConcertInput = {
  organizationId: string;
  title: string;
  venue: string;
  startsAt: Date;
  status?: ConcertStatus;
};

type TicketTypeInput = {
  zoneCode: string;
  price: number;
  capacity: number;
  saleStartsAt: Date;
  saleEndsAt: Date;
  perUserLimit: number;
};

export const DEFAULT_ORGANIZATION_ID = 'org-demo';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.ensureSqliteSchema();

    const count = await this.prisma.concert.count();

    if (count > 0) {
      return;
    }

    const concert = await this.createConcert({
      organizationId: DEFAULT_ORGANIZATION_ID,
      title: 'TicketBox Live Demo',
      venue: 'Saigon Exhibition Hall',
      startsAt: new Date('2026-08-15T19:30:00.000Z'),
      status: 'published',
    });

    await this.createTicketType(concert.id, DEFAULT_ORGANIZATION_ID, {
      zoneCode: 'GA',
      price: 450000,
      capacity: 500,
      saleStartsAt: new Date('2026-06-01T09:00:00.000Z'),
      saleEndsAt: new Date('2026-08-15T18:00:00.000Z'),
      perUserLimit: 4,
    });
  }

  async listAdminConcerts(organizationId: string): Promise<Concert[]> {
    const concerts = await this.prisma.concert.findMany({
      where: { organizationId },
      include: { ticketTypes: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    return concerts.map((concert) => this.toConcert(concert));
  }

  async listPublicConcerts(): Promise<Concert[]> {
    const concerts = await this.prisma.concert.findMany({
      where: { status: 'published' },
      include: { ticketTypes: { orderBy: { createdAt: 'asc' } } },
      orderBy: { startsAt: 'asc' },
    });

    return concerts.map((concert) => this.toConcert(concert));
  }

  async getConcert(id: string, organizationId?: string): Promise<Concert> {
    const concert = await this.prisma.concert.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      include: { ticketTypes: { orderBy: { createdAt: 'asc' } } },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    return this.toConcert(concert);
  }

  async createConcert(input: ConcertInput): Promise<Concert> {
    const concert = await this.prisma.concert.create({
      data: {
        id: this.createId('concert'),
        organizationId: input.organizationId,
        title: input.title.trim(),
        venue: input.venue.trim(),
        startsAt: input.startsAt,
        status: input.status ?? 'draft',
      },
      include: { ticketTypes: true },
    });

    return this.toConcert(concert);
  }

  async updateConcert(
    id: string,
    organizationId: string,
    input: Partial<Omit<ConcertInput, 'organizationId'>>,
  ): Promise<Concert> {
    await this.assertConcertOwnership(id, organizationId);

    const concert = await this.prisma.concert.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.venue !== undefined ? { venue: input.venue.trim() } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: { ticketTypes: { orderBy: { createdAt: 'asc' } } },
    });

    return this.toConcert(concert);
  }

  async createTicketType(
    concertId: string,
    organizationId: string,
    input: TicketTypeInput,
  ): Promise<TicketType> {
    await this.assertConcertOwnership(concertId, organizationId);

    const ticketType = await this.prisma.ticketType.create({
      data: {
        id: this.createId('ticket-type'),
        concertId,
        zoneCode: input.zoneCode.trim().toUpperCase(),
        price: Number(input.price),
        capacity: Number(input.capacity),
        saleStartsAt: input.saleStartsAt,
        saleEndsAt: input.saleEndsAt,
        perUserLimit: Number(input.perUserLimit),
      },
    });

    return this.toTicketType(ticketType);
  }

  async updateTicketType(
    id: string,
    organizationId: string,
    input: Partial<TicketTypeInput>,
  ): Promise<TicketType> {
    const existing = await this.prisma.ticketType.findFirst({
      where: { id, concert: { organizationId } },
    });

    if (!existing) {
      throw new NotFoundException('Ticket type not found');
    }

    const saleStartsAt = input.saleStartsAt ?? existing.saleStartsAt;
    const saleEndsAt = input.saleEndsAt ?? existing.saleEndsAt;

    if (saleEndsAt <= saleStartsAt) {
      throw new BadRequestException('saleEndsAt must be after saleStartsAt');
    }

    const ticketType = await this.prisma.ticketType.update({
      where: { id },
      data: {
        ...(input.zoneCode !== undefined ? { zoneCode: input.zoneCode.trim().toUpperCase() } : {}),
        ...(input.price !== undefined ? { price: Number(input.price) } : {}),
        ...(input.capacity !== undefined ? { capacity: Number(input.capacity) } : {}),
        ...(input.saleStartsAt !== undefined ? { saleStartsAt: input.saleStartsAt } : {}),
        ...(input.saleEndsAt !== undefined ? { saleEndsAt: input.saleEndsAt } : {}),
        ...(input.perUserLimit !== undefined ? { perUserLimit: Number(input.perUserLimit) } : {}),
      },
    });

    return this.toTicketType(ticketType);
  }

  private async assertConcertOwnership(id: string, organizationId: string) {
    const concert = await this.prisma.concert.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private toConcert(concert: {
    id: string;
    organizationId: string;
    title: string;
    venue: string;
    startsAt: Date;
    status: string;
    ticketTypes: Array<{
      id: string;
      concertId: string;
      zoneCode: string;
      price: number;
      capacity: number;
      saleStartsAt: Date;
      saleEndsAt: Date;
      perUserLimit: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): Concert {
    return {
      id: concert.id,
      organizationId: concert.organizationId,
      title: concert.title,
      venue: concert.venue,
      startsAt: concert.startsAt.toISOString(),
      status: concert.status as ConcertStatus,
      ticketTypes: concert.ticketTypes.map((ticketType) => this.toTicketType(ticketType)),
      createdAt: concert.createdAt.toISOString(),
      updatedAt: concert.updatedAt.toISOString(),
    };
  }

  private toTicketType(ticketType: {
    id: string;
    concertId: string;
    zoneCode: string;
    price: number;
    capacity: number;
    saleStartsAt: Date;
    saleEndsAt: Date;
    perUserLimit: number;
    createdAt: Date;
    updatedAt: Date;
  }): TicketType {
    return {
      id: ticketType.id,
      concertId: ticketType.concertId,
      zoneCode: ticketType.zoneCode,
      price: ticketType.price,
      capacity: ticketType.capacity,
      saleStartsAt: ticketType.saleStartsAt.toISOString(),
      saleEndsAt: ticketType.saleEndsAt.toISOString(),
      perUserLimit: ticketType.perUserLimit,
      createdAt: ticketType.createdAt.toISOString(),
      updatedAt: ticketType.updatedAt.toISOString(),
    };
  }
}
