import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { DomainError } from '../../common/errors/domain-error';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly cacheInvalidationService: CacheInvalidationService,
    private readonly configService: ConfigService,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async createReservation(userId: string, dto: CreateReservationDto) {
    const existingReservation =
      await this.inventoryRepository.findReservationByIdempotencyKey(
        userId,
        dto.idempotencyKey,
      );

    if (existingReservation) {
      this.ensureDuplicatePayloadMatches(existingReservation, dto);
      this.logger.log(
        formatStructuredLog('reservation_idempotent_replay', {
          reservationId: existingReservation.id,
          ticketTypeId: dto.ticketTypeId,
          quantity: dto.quantity,
        }),
      );
      return this.toReservationResponse(existingReservation);
    }

    try {
      const reservation = await this.inventoryRepository.reserve(
        userId,
        dto,
        this.getReservationTtlMinutes(),
      );
      await this.cacheInvalidationService.invalidateTicketType(
        reservation.ticketTypeId,
      );
      this.logger.log(
        formatStructuredLog('reservation_created', {
          reservationId: reservation.id,
          ticketTypeId: reservation.ticketTypeId,
          quantity: reservation.quantity,
          expiresAt: reservation.expiresAt.toISOString(),
        }),
      );
      return this.toReservationResponse(reservation);
    } catch (error) {
      if (!this.inventoryRepository.isDuplicateReservationError(error)) {
        throw error;
      }

      const duplicateReservation =
        await this.inventoryRepository.findReservationByIdempotencyKey(
          userId,
          dto.idempotencyKey,
        );

      if (!duplicateReservation) {
        throw error;
      }

      this.ensureDuplicatePayloadMatches(duplicateReservation, dto);
      this.logger.log(
        formatStructuredLog('reservation_duplicate_resolved', {
          reservationId: duplicateReservation.id,
          ticketTypeId: duplicateReservation.ticketTypeId,
          quantity: duplicateReservation.quantity,
        }),
      );
      return this.toReservationResponse(duplicateReservation);
    }
  }

  async expireReservationsBatch() {
    return this.inventoryRepository.expireReservations(
      this.getReservationExpiryBatchSize(),
      new Date(),
    );
  }

  private ensureDuplicatePayloadMatches(
    reservation: { ticketTypeId: string; quantity: number },
    dto: CreateReservationDto,
  ): void {
    if (
      reservation.ticketTypeId !== dto.ticketTypeId ||
      reservation.quantity !== dto.quantity
    ) {
      throw new DomainError(
        'Idempotency key was already used with a different reservation payload',
        'duplicate_request_conflict',
        409,
      );
    }
  }

  private getReservationTtlMinutes(): number {
    const configuredValue = this.configService.get<string>(
      'RESERVATION_TTL_MINUTES',
    );
    const ttl = Number(configuredValue ?? 10);

    if (!Number.isFinite(ttl) || ttl <= 0) {
      return 10;
    }

    return ttl;
  }

  private getReservationExpiryBatchSize(): number {
    const configuredValue = this.configService.get<string>(
      'RESERVATION_EXPIRY_BATCH_SIZE',
    );
    const batchSize = Number(configuredValue ?? 100);

    if (!Number.isFinite(batchSize) || batchSize <= 0) {
      return 100;
    }

    return Math.floor(batchSize);
  }

  private toReservationResponse(reservation: {
    id: string;
    status: string;
    ticketTypeId: string;
    quantity: number;
    expiresAt: Date;
    userId: string;
  }) {
    return {
      id: reservation.id,
      status: reservation.status,
      userId: reservation.userId,
      ticketTypeId: reservation.ticketTypeId,
      quantity: reservation.quantity,
      expiresAt: reservation.expiresAt,
    };
  }
}
