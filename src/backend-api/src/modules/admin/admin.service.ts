import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReservationStatus,
  TicketStatus,
} from '@prisma/client';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConcertPosterStorageService } from '../concert-poster/concert-poster-storage.service';
import { NotificationService } from '../notification/notification.service';
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
    @Optional()
    private readonly notificationService?: NotificationService,
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

  async getDashboard(user: CurrentUser) {
    const organizationId = this.requireOrganizerOrganization(user);
    const concerts = await this.prisma.concert.findMany({
      where: { organizationId },
      include: {
        ticketTypes: {
          include: { inventory: true },
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    const entries = await Promise.all(
      concerts.map((concert) => this.buildDashboardEntry(concert)),
    );

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        concerts: entries.length,
        publishedConcerts: entries.filter((entry) => entry.status === 'published')
          .length,
        canceledConcerts: entries.filter((entry) => entry.status === 'canceled')
          .length,
        grossRevenue: sumCurrency(entries.map((entry) => entry.revenue.gross)),
        refundExposure: sumCurrency(
          entries.map((entry) => entry.revenue.refundExposure),
        ),
        ticketsIssued: sumNumber(entries.map((entry) => entry.inventory.issued)),
        ticketsCheckedIn: sumNumber(
          entries.map((entry) => entry.inventory.checkedIn),
        ),
        ticketsReserved: sumNumber(
          entries.map((entry) => entry.inventory.reserved),
        ),
        ticketsAvailable: sumNumber(
          entries.map((entry) => entry.inventory.available),
        ),
        pendingOrders: sumNumber(
          entries.map((entry) => entry.orders.pendingPayment),
        ),
        refundRequiredOrders: sumNumber(
          entries.map((entry) => entry.orders.refundRequired),
        ),
      },
      concerts: entries,
    };
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

  async getConcertOperations(user: CurrentUser, concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      include: {
        ticketTypes: {
          include: { inventory: true },
          orderBy: [{ price: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    this.assertOrganizerOwnsConcert(user, concert.organizationId);

    const [dashboard, refundQueue, cancellationPreview] = await Promise.all([
      this.buildDashboardEntry(concert),
      this.listRefundQueue(concert.id),
      this.buildCancellationPreview(concert),
    ]);

    return {
      concert: {
        id: concert.id,
        title: concert.title,
        status: concert.status,
        artistName: concert.artistName,
        venue: concert.venue,
        startAt: concert.startAt,
      },
      summary: dashboard,
      ticketTypeBreakdown: concert.ticketTypes.map((ticketType) => ({
        ticketTypeId: ticketType.id,
        zoneCode: ticketType.zoneCode,
        name: ticketType.name,
        price: ticketType.price.toString(),
        capacity: ticketType.capacity,
        perUserLimit: ticketType.perUserLimit,
        saleStartAt: ticketType.saleStartAt,
        saleEndAt: ticketType.saleEndAt,
        reservedCount: ticketType.inventory?.reservedCount ?? 0,
        soldCount: ticketType.inventory?.soldCount ?? 0,
        availableCount: ticketType.inventory
          ? Math.max(
              ticketType.inventory.totalCapacity -
                ticketType.inventory.reservedCount -
                ticketType.inventory.soldCount,
              0,
            )
          : 0,
      })),
      refundQueue,
      cancellationPreview,
    };
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

    if (status === 'canceled') {
      throw new BadRequestException(
        'Cannot create a canceled concert. Create a draft first, then use the dedicated cancellation workflow if needed.',
      );
    }

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
      if (status === 'canceled') {
        throw new BadRequestException(
          'Use the dedicated cancel workflow instead of changing status here.',
        );
      }
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

  async deleteConcert(user: CurrentUser, id: string) {
    const concert = await this.findOwnedConcert(user, id);

    try {
      await this.prisma.concert.delete({
        where: { id: concert.id },
      });
    } catch (error) {
      if (isDeleteBlockedError(error)) {
        throw new ConflictException(
          'Cannot delete a concert with dependent sales, orders, tickets, or guest list data.',
        );
      }
      throw error;
    }

    await this.cacheInvalidationService.invalidateConcert(concert.id);

    if (concert.posterObjectKey) {
      this.concertPosterStorage
        .delete(concert.posterObjectKey)
        .catch((cleanupError) => {
          this.logger.warn(
            `Failed to clean up deleted concert poster ${concert.posterObjectKey}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          );
        });
    }

    return { id: concert.id };
  }

  async cancelConcert(
    user: CurrentUser,
    concertId: string,
    body?: { reason?: string | null },
  ) {
    const concert = await this.findOwnedConcert(user, concertId);
    const cancellationReason =
      optionalNullableString(body?.reason, 'reason') ?? null;

    if (concert.status === 'canceled') {
      const preview = await this.buildCancellationPreview(concert);
      return {
        concertId: concert.id,
        title: concert.title,
        status: concert.status,
        cancellation: {
          performedAt: null,
          reason: cancellationReason,
          ...preview,
        },
      };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ownedConcert = await tx.concert.findUnique({
        where: { id: concertId },
        include: {
          ticketTypes: {
            include: { inventory: true },
          },
        },
      });

      if (!ownedConcert) {
        throw new NotFoundException('Concert not found');
      }

      if (ownedConcert.organizationId !== user.organizationId) {
        throw new ForbiddenException('Concert belongs to another organization');
      }

      const activeReservations = await tx.reservation.findMany({
        where: {
          status: ReservationStatus.active,
          ticketType: {
            concertId,
          },
        },
        select: {
          id: true,
          userId: true,
          ticketTypeId: true,
          quantity: true,
        },
      });

      const orderRows = await tx.order.findMany({
        where: {
          items: {
            some: {
              ticketType: {
                concertId,
              },
            },
          },
        },
        include: {
          payments: {
            orderBy: { createdAt: 'asc' },
          },
          tickets: true,
        },
      });

      const issuedTicketIds = (
        await tx.ticket.findMany({
          where: {
            status: TicketStatus.issued,
            ticketType: {
              concertId,
            },
          },
          select: { id: true },
        })
      ).map((ticket) => ticket.id);

      await tx.concert.update({
        where: { id: concertId },
        data: { status: 'canceled' },
      });

      if (activeReservations.length > 0) {
        await tx.reservation.updateMany({
          where: {
            id: {
              in: activeReservations.map((reservation) => reservation.id),
            },
          },
          data: {
            status: ReservationStatus.expired,
          },
        });

        for (const [ticketTypeId, quantity] of aggregateByKey(
          activeReservations,
          (reservation) => reservation.ticketTypeId,
          (reservation) => reservation.quantity,
        )) {
          await tx.inventoryCounter.updateMany({
            where: { ticketTypeId },
            data: {
              reservedCount: { decrement: quantity },
              version: { increment: 1 },
            },
          });
        }

        for (const [compositeKey, quantity] of aggregateByKey(
          activeReservations,
          (reservation) => `${reservation.userId}:${reservation.ticketTypeId}`,
          (reservation) => reservation.quantity,
        )) {
          const [quotaUserId, quotaTicketTypeId] = compositeKey.split(':');
          await tx.userTicketQuota.updateMany({
            where: {
              userId: quotaUserId,
              ticketTypeId: quotaTicketTypeId,
            },
            data: {
              reservedCount: { decrement: quantity },
            },
          });
        }
      }

      let ordersMarkedRefundRequired = 0;
      let ordersExpired = 0;
      let paymentsExpired = 0;
      const refundNotifications: Array<{
        orderId: string;
        ownerUserId: string;
        ticketCount: number;
      }> = [];

      for (const order of orderRows) {
        const paymentStatuses = order.payments.map((payment) => payment.status);
        const needsRefundWorkflow =
          order.status === OrderStatus.issued ||
          order.status === OrderStatus.paid ||
          order.status === OrderStatus.refund_required ||
          paymentStatuses.includes(PaymentStatus.succeeded) ||
          paymentStatuses.includes(PaymentStatus.pending_reconciliation);

        if (needsRefundWorkflow) {
          if (order.status !== OrderStatus.refund_required) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.refund_required },
            });
            ordersMarkedRefundRequired += 1;
          }

          refundNotifications.push({
            orderId: order.id,
            ownerUserId: order.userId,
            ticketCount: order.tickets.length,
          });
          continue;
        }

        if (order.status === OrderStatus.pending_payment) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.expired },
          });
          ordersExpired += 1;
        }

        const mutablePaymentIds = order.payments
          .filter(
            (payment) =>
              payment.status === PaymentStatus.created ||
              payment.status === PaymentStatus.pending,
          )
          .map((payment) => payment.id);

        if (mutablePaymentIds.length > 0) {
          await tx.payment.updateMany({
            where: {
              id: {
                in: mutablePaymentIds,
              },
            },
            data: {
              status: PaymentStatus.expired,
            },
          });
          paymentsExpired += mutablePaymentIds.length;
        }
      }

      if (issuedTicketIds.length > 0) {
        await tx.ticket.updateMany({
          where: {
            id: {
              in: issuedTicketIds,
            },
          },
          data: {
            status: TicketStatus.revoked,
          },
        });
      }

      return {
        concert: ownedConcert,
        reservationsExpired: activeReservations.length,
        ordersMarkedRefundRequired,
        ordersExpired,
        paymentsExpired,
        ticketsRevoked: issuedTicketIds.length,
        refundNotifications,
      };
    });

    let notificationsCreated = 0;
    if (this.notificationService && result.refundNotifications.length > 0) {
      try {
        const notificationResult =
          await this.notificationService.createConcertCanceledRefundTasks({
            concertId: result.concert.id,
            concertTitle: result.concert.title,
            organizationId: result.concert.organizationId,
            refunds: result.refundNotifications,
          });
        notificationsCreated = notificationResult.tasksCreated;
      } catch (error) {
        this.logger.error(
          `Failed to create concert cancellation notifications for ${result.concert.id}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    await this.cacheInvalidationService.invalidateConcert(concertId);
    await Promise.all(
      result.concert.ticketTypes.map((ticketType) =>
        this.cacheInvalidationService.invalidateTicketType(
          ticketType.id,
          concertId,
        ),
      ),
    );

    return {
      concertId: result.concert.id,
      title: result.concert.title,
      status: 'canceled',
      cancellation: {
        alreadyCanceled: false,
        performedAt: new Date().toISOString(),
        reason: cancellationReason,
        activeReservationsToExpire: result.reservationsExpired,
        pendingOrdersToExpire: result.ordersExpired,
        ordersToMarkRefundRequired: result.ordersMarkedRefundRequired,
        paymentsToExpire: result.paymentsExpired,
        paymentsAwaitingReconciliation: 0,
        issuedTicketsToRevoke: result.ticketsRevoked,
        notificationsToCreate: notificationsCreated,
      },
    };
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

  private async buildDashboardEntry(concert: {
    id: string;
    title: string;
    status: string;
    artistName: string;
    venue: string;
    startAt: Date;
    ticketTypes: Array<{
      id: string;
      inventory: {
        totalCapacity: number;
        reservedCount: number;
        soldCount: number;
      } | null;
    }>;
  }) {
    const orders = await this.listConcertOrderSnapshots(concert.id);
    const orderSummary = summarizeOrders(orders);
    const inventorySummary = summarizeInventory(concert.ticketTypes);
    const ticketSummary = summarizeTickets(orders);

    return {
      concertId: concert.id,
      title: concert.title,
      status: concert.status,
      artistName: concert.artistName,
      venue: concert.venue,
      startAt: concert.startAt,
      ticketTypesCount: concert.ticketTypes.length,
      inventory: {
        capacity: inventorySummary.capacity,
        sold: inventorySummary.sold,
        reserved: inventorySummary.reserved,
        available: inventorySummary.available,
        issued: ticketSummary.issued,
        checkedIn: ticketSummary.checkedIn,
        revoked: ticketSummary.revoked,
      },
      orders: orderSummary.counts,
      revenue: {
        gross: orderSummary.grossRevenue.toFixed(2),
        refundExposure: orderSummary.refundExposure.toFixed(2),
      },
    };
  }

  private async listConcertOrderSnapshots(concertId: string) {
    return this.prisma.order.findMany({
      where: {
        items: {
          some: {
            ticketType: {
              concertId,
            },
          },
        },
      },
      select: {
        id: true,
        userId: true,
        status: true,
        totalAmount: true,
        buyerFullName: true,
        buyerEmail: true,
        buyerPhone: true,
        createdAt: true,
        payments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            status: true,
            provider: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async listRefundQueue(concertId: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.refund_required,
        items: {
          some: {
            ticketType: {
              concertId,
            },
          },
        },
      },
      include: {
        payments: {
          orderBy: { createdAt: 'asc' },
        },
        tickets: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      orderId: order.id,
      buyerFullName: order.buyerFullName,
      buyerEmail: order.buyerEmail,
      buyerPhone: order.buyerPhone,
      totalAmount: order.totalAmount.toString(),
      orderStatus: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
      paymentProvider: order.payments[0]?.provider ?? null,
      issuedTicketCount: order.tickets.filter(
        (ticket) => ticket.status === TicketStatus.issued,
      ).length,
      revokedTicketCount: order.tickets.filter(
        (ticket) => ticket.status === TicketStatus.revoked,
      ).length,
      createdAt: order.createdAt,
    }));
  }

  private async buildCancellationPreview(concert: {
    id: string;
    status: string;
  }) {
    const [activeReservations, orders, issuedTicketCount] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          status: ReservationStatus.active,
          ticketType: {
            concertId: concert.id,
          },
        },
        select: { id: true },
      }),
      this.listConcertOrderSnapshots(concert.id),
      this.prisma.ticket.count({
        where: {
          status: TicketStatus.issued,
          ticketType: {
            concertId: concert.id,
          },
        },
      }),
    ]);

    let pendingOrdersToExpire = 0;
    let paymentsToExpire = 0;
    let paymentsAwaitingReconciliation = 0;
    const newRefundOrders = orders.filter((order) => {
      const statuses = order.payments.map((payment) => payment.status);
      paymentsAwaitingReconciliation += statuses.filter(
        (status) => status === PaymentStatus.pending_reconciliation,
      ).length;
      const needsRefundWorkflow =
        order.status === OrderStatus.issued ||
        order.status === OrderStatus.paid ||
        order.status === OrderStatus.refund_required ||
        statuses.includes(PaymentStatus.succeeded) ||
        statuses.includes(PaymentStatus.pending_reconciliation);

      if (!needsRefundWorkflow && order.status === OrderStatus.pending_payment) {
        pendingOrdersToExpire += 1;
      }

      if (!needsRefundWorkflow) {
        paymentsToExpire += statuses.filter(
          (status) =>
            status === PaymentStatus.created || status === PaymentStatus.pending,
        ).length;
      }

      return needsRefundWorkflow && order.status !== OrderStatus.refund_required;
    });

    return {
      currentStatus: concert.status,
      willChangeStatusTo: 'canceled',
      alreadyCanceled: concert.status === 'canceled',
      activeReservationsToExpire:
        concert.status === 'canceled' ? 0 : activeReservations.length,
      pendingOrdersToExpire: concert.status === 'canceled' ? 0 : pendingOrdersToExpire,
      ordersToMarkRefundRequired:
        concert.status === 'canceled' ? 0 : newRefundOrders.length,
      paymentsToExpire: concert.status === 'canceled' ? 0 : paymentsToExpire,
      paymentsAwaitingReconciliation,
      issuedTicketsToRevoke: concert.status === 'canceled' ? 0 : issuedTicketCount,
      notificationsToCreate:
        concert.status === 'canceled' ? 0 : newRefundOrders.length * 2,
    };
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

function aggregateByKey<T>(
  items: T[],
  keyOf: (item: T) => string,
  valueOf: (item: T) => number,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    totals.set(key, (totals.get(key) ?? 0) + valueOf(item));
  }
  return totals;
}

function sumCurrency(values: Array<string>): string {
  const total = values.reduce((sum, value) => sum + Number(value), 0);
  return total.toFixed(2);
}

function sumNumber(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function summarizeInventory(
  ticketTypes: Array<{
    inventory: {
      totalCapacity: number;
      reservedCount: number;
      soldCount: number;
    } | null;
  }>,
) {
  return ticketTypes.reduce(
    (totals, ticketType) => {
      const capacity = ticketType.inventory?.totalCapacity ?? 0;
      const reserved = ticketType.inventory?.reservedCount ?? 0;
      const sold = ticketType.inventory?.soldCount ?? 0;

      totals.capacity += capacity;
      totals.reserved += reserved;
      totals.sold += sold;
      totals.available += Math.max(capacity - reserved - sold, 0);
      return totals;
    },
    { capacity: 0, reserved: 0, sold: 0, available: 0 },
  );
}

function summarizeTickets(
  orders: Array<{
    tickets: Array<{
      status: TicketStatus;
    }>;
  }>,
) {
  const ticketStatuses = orders.flatMap((order) => order.tickets);
  return {
    issued: ticketStatuses.filter((ticket) => ticket.status === TicketStatus.issued)
      .length,
    checkedIn: ticketStatuses.filter(
      (ticket) => ticket.status === TicketStatus.checked_in,
    ).length,
    revoked: ticketStatuses.filter(
      (ticket) => ticket.status === TicketStatus.revoked,
    ).length,
  };
}

function summarizeOrders(
  orders: Array<{
    status: OrderStatus;
    totalAmount: Prisma.Decimal;
    payments: Array<{
      status: PaymentStatus;
    }>;
  }>,
) {
  const counts = {
    total: orders.length,
    pendingPayment: 0,
    issued: 0,
    refundRequired: 0,
    failed: 0,
    expired: 0,
  };

  let grossRevenue = 0;
  let refundExposure = 0;

  for (const order of orders) {
    if (order.status === OrderStatus.pending_payment) counts.pendingPayment += 1;
    if (order.status === OrderStatus.issued) counts.issued += 1;
    if (order.status === OrderStatus.refund_required) counts.refundRequired += 1;
    if (order.status === OrderStatus.failed) counts.failed += 1;
    if (order.status === OrderStatus.expired) counts.expired += 1;

    if (
      order.status === OrderStatus.issued ||
      order.status === OrderStatus.paid ||
      order.payments.some((payment) => payment.status === PaymentStatus.succeeded)
    ) {
      grossRevenue += Number(order.totalAmount);
    }

    if (order.status === OrderStatus.refund_required) {
      refundExposure += Number(order.totalAmount);
    }
  }

  return { counts, grossRevenue, refundExposure };
}

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function isDeleteBlockedError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2003' || error.code === 'P2014')
  );
}
