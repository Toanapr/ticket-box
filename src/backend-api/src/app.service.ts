import { Injectable, NotFoundException } from '@nestjs/common';

export type ConcertStatus = 'draft' | 'published';

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

type ConcertInput = {
  title: string;
  venue: string;
  startsAt: string;
  status?: ConcertStatus;
};

type TicketTypeInput = {
  zoneCode: string;
  price: number;
  capacity: number;
  saleStartsAt: string;
  saleEndsAt: string;
  perUserLimit: number;
};

const DEFAULT_ORGANIZATION_ID = 'org-demo';

@Injectable()
export class AppService {
  private readonly concerts = new Map<string, Concert>();

  constructor() {
    const concert = this.createConcert({
      title: 'TicketBox Live Demo',
      venue: 'Saigon Exhibition Hall',
      startsAt: '2026-08-15T19:30',
      status: 'published',
    });

    this.createTicketType(concert.id, {
      zoneCode: 'GA',
      price: 450000,
      capacity: 500,
      saleStartsAt: '2026-06-01T09:00',
      saleEndsAt: '2026-08-15T18:00',
      perUserLimit: 4,
    });
  }

  listAdminConcerts(): Concert[] {
    return [...this.concerts.values()].map((concert) => this.cloneConcert(concert));
  }

  listPublicConcerts(): Concert[] {
    return this.listAdminConcerts().filter((concert) => concert.status === 'published');
  }

  getConcert(id: string): Concert {
    const concert = this.concerts.get(id);

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    return this.cloneConcert(concert);
  }

  createConcert(input: ConcertInput): Concert {
    const now = new Date().toISOString();
    const concert: Concert = {
      id: this.createId('concert'),
      organizationId: DEFAULT_ORGANIZATION_ID,
      title: input.title.trim(),
      venue: input.venue.trim(),
      startsAt: input.startsAt,
      status: input.status ?? 'draft',
      ticketTypes: [],
      createdAt: now,
      updatedAt: now,
    };

    this.concerts.set(concert.id, concert);

    return this.cloneConcert(concert);
  }

  updateConcert(id: string, input: Partial<ConcertInput>): Concert {
    const concert = this.concerts.get(id);

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    concert.title = input.title?.trim() ?? concert.title;
    concert.venue = input.venue?.trim() ?? concert.venue;
    concert.startsAt = input.startsAt ?? concert.startsAt;
    concert.status = input.status ?? concert.status;
    concert.updatedAt = new Date().toISOString();

    return this.cloneConcert(concert);
  }

  createTicketType(concertId: string, input: TicketTypeInput): TicketType {
    const concert = this.concerts.get(concertId);

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    const now = new Date().toISOString();
    const ticketType: TicketType = {
      id: this.createId('ticket-type'),
      concertId,
      zoneCode: input.zoneCode.trim().toUpperCase(),
      price: Number(input.price),
      capacity: Number(input.capacity),
      saleStartsAt: input.saleStartsAt,
      saleEndsAt: input.saleEndsAt,
      perUserLimit: Number(input.perUserLimit),
      createdAt: now,
      updatedAt: now,
    };

    concert.ticketTypes.push(ticketType);
    concert.updatedAt = now;

    return { ...ticketType };
  }

  updateTicketType(id: string, input: Partial<TicketTypeInput>): TicketType {
    for (const concert of this.concerts.values()) {
      const ticketType = concert.ticketTypes.find((item) => item.id === id);

      if (ticketType) {
        ticketType.zoneCode = input.zoneCode?.trim().toUpperCase() ?? ticketType.zoneCode;
        ticketType.price = input.price === undefined ? ticketType.price : Number(input.price);
        ticketType.capacity =
          input.capacity === undefined ? ticketType.capacity : Number(input.capacity);
        ticketType.saleStartsAt = input.saleStartsAt ?? ticketType.saleStartsAt;
        ticketType.saleEndsAt = input.saleEndsAt ?? ticketType.saleEndsAt;
        ticketType.perUserLimit =
          input.perUserLimit === undefined
            ? ticketType.perUserLimit
            : Number(input.perUserLimit);
        ticketType.updatedAt = new Date().toISOString();
        concert.updatedAt = ticketType.updatedAt;

        return { ...ticketType };
      }
    }

    throw new NotFoundException('Ticket type not found');
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private cloneConcert(concert: Concert): Concert {
    return {
      ...concert,
      ticketTypes: concert.ticketTypes.map((ticketType) => ({ ...ticketType })),
    };
  }
}
