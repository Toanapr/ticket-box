import { Injectable, Logger } from '@nestjs/common';

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
  private readonly records: NotificationRecord[] = [];

  listRecords(): NotificationRecord[] {
    return this.records.map((record) => ({ ...record }));
  }

  async handleTicketIssued(event: TicketIssuedEvent): Promise<void> {
    try {
      if (event.forceNotificationFailure) {
        throw new Error('Forced notification failure');
      }

      this.records.push(this.createRecord(event, 'in_app', 'sent'));
      this.records.push(this.createRecord(event, 'email_mock', 'sent'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification error';

      this.records.push(this.createRecord(event, 'in_app', 'failed', message));
      this.logger.error(`TicketIssued notification failed: ${message}`);
    }
  }

  private createRecord(
    event: TicketIssuedEvent,
    channel: NotificationRecord['channel'],
    status: NotificationStatus,
    error?: string,
  ): NotificationRecord {
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
      createdAt: new Date().toISOString(),
    };
  }
}
