import { Injectable, Logger } from '@nestjs/common';
import { formatStructuredLog } from '../../common/logging/structured-log.util';

@Injectable()
export class TicketNotificationPublisher {
  private readonly logger = new Logger(TicketNotificationPublisher.name);

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
  }
}
