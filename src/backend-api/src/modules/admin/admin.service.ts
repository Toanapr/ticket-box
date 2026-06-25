import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConcertPosterStorageService } from '../concert-poster/concert-poster-storage.service';
import {
  concertSlugCandidate,
  slugifyConcertTitle,
} from '../concert/concert-slug.util';
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
import {
  slugifyTicketTypeName,
  ticketTypeSlugCandidate,
} from './ticket-type-slug.util';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly concertPosterStorage: ConcertPosterStorageService,
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
    const status = optionalConcertStatus(body.status) ?? 'draft';
    const title = requireString(body.title, 'title');

    if (status === 'published') {
      throw new BadRequestException(
        'Cannot create a published concert without a poster. Create as draft, upload a poster, then publish.',
      );
    }

    const baseSlug = slugifyConcertTitle(title);
    const data: Omit<Prisma.ConcertUncheckedCreateInput, 'slug'> = {
      organizationId,
      title,
      venue: requireString(body.venue, 'venue'),
      artistName: requireString(body.artistName, 'artistName'),
      description:
        optionalNullableString(body.description, 'description') ?? null,
      startAt: parseDate(body.startAt, 'startAt'),
      status,
      seatingMapObjectKey: requireString(
        body.seatingMapObjectKey,
        'seatingMapObjectKey',
      ),
      publishedArtistBio: requireString(
        body.publishedArtistBio,
        'publishedArtistBio',
      ),
    };

    let concert: Awaited<ReturnType<typeof this.prisma.concert.create>> | null =
      null;
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      try {
        concert = await this.prisma.concert.create({
          data: {
            ...data,
            slug: concertSlugCandidate(baseSlug, attempt),
          },
        });
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    }

    if (!concert) {
      throw new ConflictException('Unable to generate a unique concert slug');
    }

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

    if (status !== undefined) {
      if (status === 'published') {
        await this.assertPosterAvailableForPublish(existing.posterObjectKey);
      }
      data.status = status;
    }
    if (title !== undefined) data.title = title;
    if (venue !== undefined) data.venue = venue;
    if (artistName !== undefined) data.artistName = artistName;
    if (description !== undefined) data.description = description;
    if (startAt !== undefined) data.startAt = startAt;
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
    const name = requireString(body.name, 'name');
    const baseSlug = slugifyTicketTypeName(name);
    const data: Omit<Prisma.TicketTypeUncheckedCreateInput, 'slug'> = {
      concertId,
      zoneCode: requireString(body.zoneCode, 'zoneCode'),
      name,
      price: parsePrice(body.price),
      capacity,
      perUserLimit: parsePositiveInt(body.perUserLimit, 'perUserLimit'),
      saleStartAt,
      saleEndAt,
    };

    let ticketType: Awaited<
      ReturnType<typeof this.prisma.ticketType.create>
    > | null = null;
    for (let attempt = 1; attempt <= 100; attempt += 1) {
      try {
        ticketType = await this.prisma.$transaction(async (tx) => {
          const created = await tx.ticketType.create({
            data: {
              ...data,
              slug: ticketTypeSlugCandidate(baseSlug, attempt),
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
        break;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
      }
    }

    if (!ticketType) {
      throw new ConflictException(
        'Unable to generate a unique ticket type slug',
      );
    }

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

  async uploadPoster(
    user: CurrentUser,
    concertId: string,
    file: Express.Multer.File,
  ) {
    const concert = await this.findOwnedConcert(user, concertId);

    const oldKey = concert.posterObjectKey;
    const nextVersion = oldKey
      ? (this.concertPosterStorage.parseVersion(oldKey) ?? 0) + 1
      : 1;

    const mime = file.mimetype;
    const { objectKey } = await this.concertPosterStorage.save(
      concertId,
      mime,
      file.buffer,
      nextVersion,
    );

    let updatedCount: number;
    try {
      const updateResult = await this.prisma.concert.updateMany({
        where: { id: concertId, posterObjectKey: oldKey },
        data: { posterObjectKey: objectKey },
      });
      updatedCount = updateResult.count;
    } catch {
      await this.concertPosterStorage
        .delete(objectKey)
        .catch((cleanupError) => {
          this.logger.error(
            `Failed to compensate poster ${objectKey} after database error`,
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
          );
        });
      throw new InternalServerErrorException(
        'Failed to update concert poster key after saving file',
      );
    }

    if (updatedCount !== 1) {
      await this.concertPosterStorage.delete(objectKey);
      throw new ConflictException(
        'Concert poster was replaced by another request. Retry with the latest concert state.',
      );
    }

    await this.cacheInvalidationService.invalidateConcert(concertId);

    if (oldKey) {
      this.concertPosterStorage.delete(oldKey).catch((err) => {
        this.logger.warn(
          `Failed to clean up old poster ${oldKey}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }

    return { posterObjectKey: objectKey };
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

  private async assertPosterAvailableForPublish(
    posterObjectKey: string | null,
  ): Promise<void> {
    if (
      !posterObjectKey ||
      !(await this.concertPosterStorage.fileExists(posterObjectKey))
    ) {
      throw new BadRequestException(
        'Cannot publish a concert without a stored poster. Upload a poster first.',
      );
    }
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

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
