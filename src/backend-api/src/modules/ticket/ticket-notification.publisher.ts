import { Injectable, Logger } from '@nestjs/common';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from '../notification/notification-dispatch.service';

@Injectable()
export class TicketNotificationPublisher {
  private readonly logger = new Logger(TicketNotificationPublisher.name);

  constructor(
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly prisma: PrismaService,
  ) {}

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
      const organizationId = await this.findOrderOrganizationId(orderId);

      if (!organizationId) {
        this.logger.warn(
          formatStructuredLog('ticket_notification_skipped', {
            orderId,
            reason: 'organization_not_found',
          }),
        );
        return;
      }

      const message = `Issued ${ticketCount} ticket(s) for order ${orderId}`;
      await this.notificationDispatch.dispatch({
        organizationId,
        eventType: 'TicketIssued',
        orderId,
        ownerUserId,
        ticketCount,
        message,
      });

      this.logger.log(
        formatStructuredLog('ticket_notification_recorded', {
          orderId,
          organizationId,
          eventType: 'TicketIssued',
        }),
      );
    } catch (error) {
      this.logger.error(
        `Ticket notification failed for orderId=${orderId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async findOrderOrganizationId(
    orderId: string,
  ): Promise<string | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        tickets: {
          take: 1,
          select: {
            ticketType: {
              select: {
                concert: {
                  select: {
                    organizationId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return order?.tickets[0]?.ticketType.concert.organizationId ?? null;
  }
}
