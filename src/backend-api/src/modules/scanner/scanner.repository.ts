import { Injectable } from '@nestjs/common';
import {
  CheckInEvent,
  CheckInResultStatus,
  Prisma,
  ScannerAssignmentStatus,
  ScannerDeviceStatus,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type RecordCheckInAttemptParams = {
  assignmentId: string;
  scannerUserId: string;
  deviceId: string;
  eventId: string;
  concertId: string | null;
  gateCode: string;
  zoneCode: string;
  manifestVersion: number | null;
  clientEventId: string;
  ticketId: string | null;
  ticketRef: string;
  rawToken: string | null;
  clientScannedAt: Date;
  rejectionReason?: string;
};

export type RecordCheckInAttemptResult = {
  event: CheckInEvent;
  replayed: boolean;
};

@Injectable()
export class ScannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDeviceWithActiveAssignments(deviceCode: string) {
    return this.prisma.scannerDevice.findUnique({
      where: {
        deviceCode,
      },
      include: {
        assignments: {
          where: {
            status: ScannerAssignmentStatus.active,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });
  }

  isDeviceActive(status: ScannerDeviceStatus): boolean {
    return status === ScannerDeviceStatus.active;
  }

  async findManifestPayloadByAssignmentId(assignmentId: string) {
    return this.prisma.scannerAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        manifestTickets: {
          orderBy: {
            ticketRef: 'asc',
          },
        },
        revokedTickets: {
          orderBy: {
            ticketRef: 'asc',
          },
        },
        guestEntries: {
          orderBy: {
            guestRef: 'asc',
          },
        },
      },
    });
  }

  async recordCheckInAttempt(
    params: RecordCheckInAttemptParams,
  ): Promise<RecordCheckInAttemptResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const existingByClientEventId = await tx.checkInEvent.findUnique({
          where: {
            clientEventId: params.clientEventId,
          },
        });

        if (existingByClientEventId) {
          return {
            event: existingByClientEventId,
            replayed: true,
          };
        }

        await tx.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`scanner-checkin:${params.eventId}:${params.ticketRef}`}))`,
        );

        const replayAfterLock = await tx.checkInEvent.findUnique({
          where: {
            clientEventId: params.clientEventId,
          },
        });

        if (replayAfterLock) {
          return {
            event: replayAfterLock,
            replayed: true,
          };
        }

        const winningAcceptedEvent = await tx.checkInEvent.findFirst({
          where: {
            eventId: params.eventId,
            ticketRef: params.ticketRef,
            result: CheckInResultStatus.accepted,
          },
          orderBy: [
            {
              serverRecordedAt: 'asc',
            },
            {
              createdAt: 'asc',
            },
          ],
        });

        const createdEvent = await tx.checkInEvent.create({
          data: {
            clientEventId: params.clientEventId,
            ticketId: params.ticketId,
            ticketRef: params.ticketRef,
            rawToken: params.rawToken,
            scannerUserId: params.scannerUserId,
            deviceId: params.deviceId,
            assignmentId: params.assignmentId,
            eventId: params.eventId,
            concertId: params.concertId,
            gateCode: params.gateCode,
            zoneCode: params.zoneCode,
            manifestVersion: params.manifestVersion,
            clientScannedAt: params.clientScannedAt,
            result: this.resolveResult(
              params.rejectionReason,
              winningAcceptedEvent,
            ),
            reason: this.resolveReason(
              params.rejectionReason,
              winningAcceptedEvent,
            ),
            winningEventId: winningAcceptedEvent?.id ?? null,
          },
        });

        if (
          createdEvent.result === CheckInResultStatus.accepted &&
          params.ticketId &&
          this.isUuid(params.ticketId)
        ) {
          await tx.ticket.updateMany({
            where: {
              id: params.ticketId,
              status: TicketStatus.issued,
            },
            data: { status: TicketStatus.checked_in },
          });
        }

        return {
          event: createdEvent,
          replayed: false,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  private resolveResult(
    rejectionReason: string | undefined,
    winningAcceptedEvent: CheckInEvent | null,
  ): CheckInResultStatus {
    if (rejectionReason) {
      return CheckInResultStatus.rejected;
    }

    if (winningAcceptedEvent) {
      return CheckInResultStatus.conflict;
    }

    return CheckInResultStatus.accepted;
  }

  private resolveReason(
    rejectionReason: string | undefined,
    winningAcceptedEvent: CheckInEvent | null,
  ): string {
    if (rejectionReason) {
      return rejectionReason;
    }

    if (winningAcceptedEvent) {
      return 'ticket_already_checked_in';
    }

    return 'accepted_first_scan';
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
