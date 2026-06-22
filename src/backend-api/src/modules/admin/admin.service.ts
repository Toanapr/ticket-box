import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';
import {
  ConcertBody,
  optionalConcertStatus,
  optionalDate,
  optionalNullableString,
  optionalPositiveInt,
  optionalPrice,
  optionalString,
  parseDate,
  parsePositiveInt,
  parsePrice,
  requireString,
  TicketTypeBody,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly prisma: PrismaService,
  ) {}

  async listConcerts(user: CurrentUser) {
    const organizationId = this.requireOrganizerOrganization(user);

    return this.prisma.concert.findMany({
      where: { organizationId },
      include: {
        ticketTypes: {
          include: { inventory: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { startAt: 'desc' },
    });
  }

  async getConcert(user: CurrentUser, id: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id },
      include: {
        ticketTypes: {
          include: { inventory: true },
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    this.assertOrganizerOwnsConcert(user, concert.organizationId);

    return concert;
  }

  async listNotificationRecords(user: CurrentUser) {
    const organizationId = this.requireOrganizerOrganization(user);

    return this.prisma.notificationRecord.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async createConcert(user: CurrentUser, body: ConcertBody) {
    const organizationId = this.requireOrganizerOrganization(user);

    const concert = await this.prisma.concert.create({
      data: {
        organizationId,
        title: requireString(body.title, 'title'),
        venue: requireString(body.venue, 'venue'),
        artistName: requireString(body.artistName, 'artistName'),
        description:
          optionalNullableString(body.description, 'description') ?? null,
        startAt: parseDate(body.startAt, 'startAt'),
        status: optionalConcertStatus(body.status) ?? 'draft',
        seatingMapObjectKey: requireString(
          body.seatingMapObjectKey,
          'seatingMapObjectKey',
        ),
        publishedArtistBio: requireString(
          body.publishedArtistBio,
          'publishedArtistBio',
        ),
      },
    });

    await this.cacheInvalidationService.invalidateConcert(concert.id);

    return concert;
  }

  async updateConcert(user: CurrentUser, id: string, body: ConcertBody) {
    const existing = await this.findOwnedConcert(user, id);
    const data: Prisma.ConcertUpdateInput = {};

    const title = optionalString(body.title, 'title');
    const venue = optionalString(body.venue, 'venue');
    const artistName = optionalString(body.artistName, 'artistName');
    const description = optionalNullableString(body.description, 'description');
    const startAt = optionalDate(body.startAt, 'startAt');
    const status = optionalConcertStatus(body.status);
    const seatingMapObjectKey = optionalString(
      body.seatingMapObjectKey,
      'seatingMapObjectKey',
    );
    const publishedArtistBio = optionalString(
      body.publishedArtistBio,
      'publishedArtistBio',
    );

    if (title !== undefined) data.title = title;
    if (venue !== undefined) data.venue = venue;
    if (artistName !== undefined) data.artistName = artistName;
    if (description !== undefined) data.description = description;
    if (startAt !== undefined) data.startAt = startAt;
    if (status !== undefined) data.status = status;
    if (seatingMapObjectKey !== undefined) {
      data.seatingMapObjectKey = seatingMapObjectKey;
    }
    if (publishedArtistBio !== undefined) {
      data.publishedArtistBio = publishedArtistBio;
    }

    const concert = await this.prisma.concert.update({
      where: { id: existing.id },
      data,
    });

    await this.cacheInvalidationService.invalidateConcert(concert.id);

    return concert;
  }

  async createTicketType(
    user: CurrentUser,
    concertId: string,
    body: TicketTypeBody,
  ) {
    await this.findOwnedConcert(user, concertId);
    const saleStartAt = parseDate(body.saleStartAt, 'saleStartAt');
    const saleEndAt = parseDate(body.saleEndAt, 'saleEndAt');

    if (saleEndAt <= saleStartAt) {
      throw new BadRequestException('saleEndAt must be after saleStartAt');
    }

    const capacity = parsePositiveInt(body.capacity, 'capacity');

    const ticketType = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticketType.create({
        data: {
          concertId,
          zoneCode: requireString(body.zoneCode, 'zoneCode'),
          name: requireString(body.name, 'name'),
          price: parsePrice(body.price),
          capacity,
          perUserLimit: parsePositiveInt(body.perUserLimit, 'perUserLimit'),
          saleStartAt,
          saleEndAt,
        },
      });

      await tx.inventoryCounter.create({
        data: {
          ticketTypeId: created.id,
          totalCapacity: capacity,
          reservedCount: 0,
          soldCount: 0,
        },
      });

      return created;
    });

    await this.cacheInvalidationService.invalidateTicketType(
      ticketType.id,
      concertId,
    );

    return ticketType;
  }

  async updateTicketType(user: CurrentUser, id: string, body: TicketTypeBody) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id },
      include: {
        concert: true,
        inventory: true,
      },
    });

    if (!ticketType) {
      throw new NotFoundException('Ticket type not found');
    }

    this.assertOrganizerOwnsConcert(user, ticketType.concert.organizationId);

    const saleHasStarted = ticketType.saleStartAt <= new Date();
    const restrictedFields: Array<keyof TicketTypeBody> = [
      'capacity',
      'price',
      'perUserLimit',
      'zoneCode',
      'saleStartAt',
      'saleEndAt',
    ];
    const restrictedChanges = restrictedFields.filter(
      (field) => body[field] !== undefined,
    );

    if (saleHasStarted && restrictedChanges.length > 0) {
      throw new ConflictException(
        `Cannot update ${restrictedChanges.join(', ')} after sale start`,
      );
    }

    const saleStartAt = optionalDate(body.saleStartAt, 'saleStartAt');
    const saleEndAt = optionalDate(body.saleEndAt, 'saleEndAt');
    const nextSaleStartAt = saleStartAt ?? ticketType.saleStartAt;
    const nextSaleEndAt = saleEndAt ?? ticketType.saleEndAt;

    if (nextSaleEndAt <= nextSaleStartAt) {
      throw new BadRequestException('saleEndAt must be after saleStartAt');
    }

    const capacity = optionalPositiveInt(body.capacity, 'capacity');

    if (capacity !== undefined && !ticketType.inventory) {
      throw new ConflictException('Ticket type inventory counter is missing');
    }

    if (
      capacity !== undefined &&
      ticketType.inventory &&
      ticketType.inventory.reservedCount + ticketType.inventory.soldCount >
        capacity
    ) {
      throw new ConflictException(
        'capacity cannot be lower than reserved plus sold count',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.ticketType.update({
        where: { id },
        data: {
          zoneCode: optionalString(body.zoneCode, 'zoneCode'),
          name: optionalString(body.name, 'name'),
          price: optionalPrice(body.price),
          capacity,
          perUserLimit: optionalPositiveInt(body.perUserLimit, 'perUserLimit'),
          saleStartAt,
          saleEndAt,
        },
      });

      if (capacity !== undefined) {
        await tx.inventoryCounter.update({
          where: { ticketTypeId: id },
          data: {
            totalCapacity: capacity,
            version: {
              increment: 1,
            },
          },
        });
      }

      return item;
    });

    await this.cacheInvalidationService.invalidateTicketType(
      updated.id,
      ticketType.concertId,
    );

    return updated;
  }

  private async findOwnedConcert(user: CurrentUser, concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    this.assertOrganizerOwnsConcert(user, concert.organizationId);

    return concert;
  }

  private requireOrganizerOrganization(user: CurrentUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Organizer must belong to an organization');
    }

    return user.organizationId;
  }

  private assertOrganizerOwnsConcert(
    user: CurrentUser,
    organizationId: string,
  ) {
    if (this.requireOrganizerOrganization(user) !== organizationId) {
      throw new ForbiddenException('Concert belongs to another organization');
    }
  }
}
