import {
  OrderStatus,
  Prisma,
  Reservation,
  ReservationStatus,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async expireReservations(limit: number, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const expiredReservations = await tx.$queryRaw<
        Array<{
          id: string;
          userId: string;
          ticketTypeId: string;
          quantity: number;
          orderId: string | null;
        }>
      >(Prisma.sql`
        SELECT
          "id",
          "userId",
          "ticketTypeId",
          "quantity",
          "orderId"
        FROM "Reservation"
        WHERE "status" = ${ReservationStatus.active}::"ReservationStatus"
          AND "expiresAt" < ${now}
        ORDER BY "expiresAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);

      let expiredCount = 0;
      let expiredOrderCount = 0;

      for (const reservation of expiredReservations) {
        const updatedReservation = await tx.reservation.updateMany({
          where: {
            id: reservation.id,
            status: ReservationStatus.active,
          },
          data: {
            status: ReservationStatus.expired,
          },
        });

        if (updatedReservation.count === 0) {
          continue;
        }

        expiredCount += 1;

        await tx.inventoryCounter.update({
          where: {
            ticketTypeId: reservation.ticketTypeId,
          },
          data: {
            reservedCount: {
              decrement: reservation.quantity,
            },
          },
        });

        await tx.userTicketQuota.update({
          where: {
            userId_ticketTypeId: {
              userId: reservation.userId,
              ticketTypeId: reservation.ticketTypeId,
            },
          },
          data: {
            reservedCount: {
              decrement: reservation.quantity,
            },
          },
        });

        if (reservation.orderId) {
          const updatedOrder = await tx.order.updateMany({
            where: {
              id: reservation.orderId,
              status: OrderStatus.pending_payment,
            },
            data: {
              status: OrderStatus.expired,
            },
          });

          expiredOrderCount += updatedOrder.count;
        }
      }

      return {
        scannedCount: expiredReservations.length,
        expiredCount,
        expiredOrderCount,
      };
    });
  }

  async findReservationByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Reservation | null> {
    return this.prisma.reservation.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
    });
  }

  isDuplicateReservationError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async reserve(userId: string, dto: CreateReservationDto, ttlMinutes: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000);

    return this.prisma.$transaction(async (tx) => {
      const ticketType = await tx.ticketType.findUnique({
        where: {
          id: dto.ticketTypeId,
        },
      });

      if (!ticketType) {
        throw new DomainError(
          'Ticket type was not found',
          'ticket_type_not_found',
          404,
        );
      }

      if (ticketType.saleStartAt > now || ticketType.saleEndAt < now) {
        throw new DomainError(
          'Sale window is not active',
          'sale_window_inactive',
          409,
        );
      }

      const lockedInventoryRows = await tx.$queryRaw<
        Array<{
          ticketTypeId: string;
          totalCapacity: number;
          reservedCount: number;
          soldCount: number;
        }>
      >(Prisma.sql`
        SELECT
        "ticket_type_id" AS "ticketTypeId",
        "total_capacity" AS "totalCapacity",
        "reserved_count" AS "reservedCount",
        "sold_count" AS "soldCount"
        FROM "inventory_counters"
        WHERE "ticket_type_id" = ${dto.ticketTypeId}::uuid
        FOR UPDATE
      `);

      const lockedInventory = lockedInventoryRows[0];

      if (!lockedInventory) {
        throw new DomainError(
          'Inventory counter was not found',
          'inventory_not_found',
          404,
        );
      }

      await tx.userTicketQuota.upsert({
        where: {
          userId_ticketTypeId: {
            userId,
            ticketTypeId: dto.ticketTypeId,
          },
        },
        update: {},
        create: {
          userId,
          ticketTypeId: dto.ticketTypeId,
          reservedCount: 0,
          paidCount: 0,
        },
      });

      const lockedQuotaRows = await tx.$queryRaw<
        Array<{
          userId: string;
          ticketTypeId: string;
          reservedCount: number;
          paidCount: number;
        }>
      >(Prisma.sql`
        SELECT
        "user_id" AS "userId",
        "ticket_type_id" AS "ticketTypeId",
        "reserved_count" AS "reservedCount",
        "paid_count" AS "paidCount"
        FROM "user_ticket_quotas"
        WHERE "user_id" = ${userId}::uuid
          AND "ticket_type_id" = ${dto.ticketTypeId}::uuid
        FOR UPDATE
      `);

      const lockedQuota = lockedQuotaRows[0];

      if (!lockedQuota) {
        throw new DomainError(
          'User quota ledger was not found',
          'quota_not_found',
          500,
        );
      }

      const availableQuantity =
        lockedInventory.totalCapacity -
        lockedInventory.reservedCount -
        lockedInventory.soldCount;

      if (availableQuantity < dto.quantity) {
        throw new DomainError('Not enough tickets available', 'sold_out', 409, {
          availableQuantity,
        });
      }

      const projectedQuota =
        lockedQuota.paidCount + lockedQuota.reservedCount + dto.quantity;

      if (projectedQuota > ticketType.perUserLimit) {
        throw new DomainError(
          'Per-user ticket limit exceeded',
          'quota_exceeded',
          409,
          {
            perUserLimit: ticketType.perUserLimit,
          },
        );
      }

      const reservation = await tx.reservation.create({
        data: {
          userId,
          ticketTypeId: dto.ticketTypeId,
          quantity: dto.quantity,
          status: ReservationStatus.active,
          expiresAt,
          idempotencyKey: dto.idempotencyKey,
        },
      });

      await tx.inventoryCounter.update({
        where: {
          ticketTypeId: dto.ticketTypeId,
        },
        data: {
          reservedCount: {
            increment: dto.quantity,
          },
        },
      });

      await tx.userTicketQuota.update({
        where: {
          userId_ticketTypeId: {
            userId,
            ticketTypeId: dto.ticketTypeId,
          },
        },
        data: {
          reservedCount: {
            increment: dto.quantity,
          },
        },
      });

      return reservation;
    });
  }
}
