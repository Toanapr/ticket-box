import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketNotificationPublisher {
  private readonly logger = new Logger(TicketNotificationPublisher.name);

  constructor(private readonly prisma: PrismaService) {}

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

      await this.prisma.notificationRecord.createMany({
        data: [
          {
            organizationId,
            eventType: 'TicketIssued',
            orderId,
            ownerUserId,
            ticketCount,
            channel: NotificationChannel.in_app,
            status: NotificationStatus.sent,
            message,
          },
          {
            organizationId,
            eventType: 'TicketIssued',
            orderId,
            ownerUserId,
            ticketCount,
            channel: NotificationChannel.email_mock,
            status: NotificationStatus.sent,
            message: `Mock email queued. ${message}`,
          },
        ],
      });

      this.logger.log(
        formatStructuredLog('ticket_notification_recorded', {
          orderId,
          organizationId,
          channels: ['in_app', 'email_mock'],
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
