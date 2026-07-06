import { Injectable, Logger } from '@nestjs/common';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class TicketNotificationPublisher {
  private readonly logger = new Logger(TicketNotificationPublisher.name);

  constructor(private readonly notificationService: NotificationService) {}

  async publishTicketIssued(
    orderId: string,
    ownerUserId: string,
    ticketCount: number,
  ): Promise<void> {
    this.logger.log(
      formatStructuredLog('ticket_issued_event_prepared', {
        orderId,
        ownerUserId,
        ticketCount,
      }),
    );

    try {
      await this.notificationService.createTicketIssuedTasks(
        orderId,
        ownerUserId,
        ticketCount,
      );

      this.logger.log(
        formatStructuredLog('ticket_notification_tasks_recorded', {
          orderId,
          channels: ['in_app', 'email'],
        }),
      );
    } catch (error) {
      this.logger.error(
        `Ticket notification failed for orderId=${orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
