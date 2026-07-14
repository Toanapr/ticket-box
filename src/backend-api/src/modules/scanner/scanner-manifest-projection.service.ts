import { Injectable } from '@nestjs/common';
import { Prisma, ScannerAssignmentStatus, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MANIFEST_VALIDITY_AFTER_CONCERT_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ScannerManifestProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshAssignment(assignmentId: string): Promise<void> {
    await this.prisma.$transaction((tx) =>
      this.refreshAssignmentInTransaction(tx, assignmentId),
    );
  }

  async refreshAssignmentsForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<void> {
    const scopes = await tx.ticket.findMany({
      where: { orderId },
      distinct: ['ticketTypeId'],
      select: {
        ticketType: {
          select: { concertId: true, zoneCode: true },
        },
      },
    });

    if (scopes.length === 0) return;

    const assignments = await tx.scannerAssignment.findMany({
      where: {
        status: ScannerAssignmentStatus.active,
        OR: scopes.map(({ ticketType }) => ({
          concertId: ticketType.concertId,
          zoneCode: ticketType.zoneCode,
        })),
      },
      select: { id: true },
    });

    for (const assignment of assignments) {
      await this.refreshAssignmentInTransaction(tx, assignment.id);
    }
  }

  async refreshAssignmentInTransaction(
    tx: Prisma.TransactionClient,
    assignmentId: string,
  ): Promise<void> {
    const assignment = await tx.scannerAssignment.findUnique({
      where: { id: assignmentId },
      include: { manifestTickets: true, revokedTickets: true },
    });
    if (!assignment) return;

    // Scanner manifests also support external event scopes that are not backed
    // by the UUID-based core Concert/Ticket tables.
    if (!this.isUuid(assignment.concertId)) return;

    const [concert, tickets] = await Promise.all([
      tx.concert.findUnique({
        where: { id: assignment.concertId },
        select: { startAt: true },
      }),
      tx.ticket.findMany({
        where: {
          qrToken: { not: null },
          ticketType: {
            concertId: assignment.concertId,
            zoneCode: assignment.zoneCode,
          },
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    const existingByTicketId = new Map(
      assignment.manifestTickets.map((ticket) => [ticket.ticketId, ticket]),
    );
    const revokedRefs = new Set(
      assignment.revokedTickets.map((ticket) => ticket.ticketRef),
    );
    let contentChanged = false;

    for (const ticket of tickets) {
      const existing = existingByTicketId.get(ticket.id);
      const ticketRef = existing?.ticketRef ?? ticket.id;
      const rawToken = ticket.qrToken!;

      if (
        !existing ||
        existing.rawToken !== rawToken ||
        existing.ticketTypeId !== ticket.ticketTypeId ||
        existing.status !== ticket.status ||
        existing.eventId !== assignment.eventId ||
        existing.gateCode !== assignment.gateCode ||
        existing.zoneCode !== assignment.zoneCode
      ) {
        contentChanged = true;
      }

      await tx.scannerManifestTicket.upsert({
        where: { assignmentId_ticketRef: { assignmentId, ticketRef } },
        create: {
          assignmentId,
          ticketId: ticket.id,
          ticketRef,
          rawToken,
          ticketTypeId: ticket.ticketTypeId,
          status: ticket.status,
          eventId: assignment.eventId,
          concertId: assignment.concertId,
          gateCode: assignment.gateCode,
          zoneCode: assignment.zoneCode,
        },
        update: {
          ticketId: ticket.id,
          rawToken,
          ticketTypeId: ticket.ticketTypeId,
          status: ticket.status,
          eventId: assignment.eventId,
          concertId: assignment.concertId,
          gateCode: assignment.gateCode,
          zoneCode: assignment.zoneCode,
        },
      });

      if (
        ticket.status === TicketStatus.revoked &&
        !revokedRefs.has(ticketRef)
      ) {
        contentChanged = true;
        await tx.scannerRevokedTicket.create({
          data: {
            assignmentId,
            ticketRef,
            reason: 'ticket_revoked',
            eventId: assignment.eventId,
            concertId: assignment.concertId,
            gateCode: assignment.gateCode,
            zoneCode: assignment.zoneCode,
          },
        });
      }
    }

    const metadataMissing =
      assignment.manifestVersion === null ||
      assignment.manifestIssuedAt === null ||
      assignment.manifestExpiresAt === null;
    if (!contentChanged && !metadataMissing) return;

    const now = new Date();
    const defaultExpiry = new Date(
      (concert?.startAt ?? now).getTime() + MANIFEST_VALIDITY_AFTER_CONCERT_MS,
    );
    await tx.scannerAssignment.update({
      where: { id: assignmentId },
      data: {
        manifestVersion: contentChanged
          ? (assignment.manifestVersion ?? 0) + 1
          : (assignment.manifestVersion ?? 1),
        manifestIssuedAt: contentChanged
          ? now
          : (assignment.manifestIssuedAt ?? now),
        manifestExpiresAt: assignment.manifestExpiresAt ?? defaultExpiry,
      },
    });
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
