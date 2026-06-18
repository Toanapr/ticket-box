import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type NotificationStatus = 'sent' | 'failed';

export type TicketIssuedEvent = {
  ticketId: string;
  orderId: string;
  concertId: string;
  recipientEmail?: string;
  forceNotificationFailure?: boolean;
};

export type NotificationRecord = {
  id: string;
  eventType: 'TicketIssued';
  ticketId: string;
  orderId: string;
  concertId: string;
  channel: 'in_app' | 'email_mock';
  status: NotificationStatus;
  message: string;
  error?: string;
  createdAt: string;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listRecords(organizationId: string): Promise<NotificationRecord[]> {
    const concerts = await this.prisma.concert.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const records = await this.prisma.notificationRecord.findMany({
      where: { concertId: { in: concerts.map((concert) => concert.id) } },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toNotificationRecord(record));
  }

  async handleTicketIssued(event: TicketIssuedEvent): Promise<void> {
    try {
      if (event.forceNotificationFailure) {
        throw new Error('Forced notification failure');
      }

      await this.prisma.notificationRecord.createMany({
        data: [
          this.createRecord(event, 'in_app', 'sent'),
          this.createRecord(event, 'email_mock', 'sent'),
        ],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification error';

      await this.prisma.notificationRecord
        .create({
          data: this.createRecord(event, 'in_app', 'failed', message),
        })
        .catch((recordError) => {
          const recordMessage =
            recordError instanceof Error ? recordError.message : 'Unknown persistence error';
          this.logger.error(`Unable to persist failed TicketIssued notification: ${recordMessage}`);
        });

      this.logger.error(`TicketIssued notification failed: ${message}`);
    }
  }

  dispatchTicketIssued(event: TicketIssuedEvent): void {
    void this.handleTicketIssued(event).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown notification error';
      this.logger.error(`Unhandled TicketIssued notification failure: ${message}`);
    });
  }

  private createRecord(
    event: TicketIssuedEvent,
    channel: NotificationRecord['channel'],
    status: NotificationStatus,
    error?: string,
  ) {
    return {
      id: `notification-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      eventType: 'TicketIssued',
      ticketId: event.ticketId,
      orderId: event.orderId,
      concertId: event.concertId,
      channel,
      status,
      message:
        channel === 'email_mock'
          ? `Mock email queued for ${event.recipientEmail ?? 'ticket holder'}`
          : 'In-app ticket issued notification created',
      error,
    };
  }

  private toNotificationRecord(record: {
    id: string;
    eventType: string;
    ticketId: string;
    orderId: string;
    concertId: string;
    channel: string;
    status: string;
    message: string;
    error: string | null;
    createdAt: Date;
  }): NotificationRecord {
    return {
      id: record.id,
      eventType: record.eventType as 'TicketIssued',
      ticketId: record.ticketId,
      orderId: record.orderId,
      concertId: record.concertId,
      channel: record.channel as NotificationRecord['channel'],
      status: record.status as NotificationStatus,
      message: record.message,
      error: record.error ?? undefined,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
