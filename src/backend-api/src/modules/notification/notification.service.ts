import { Injectable, Logger } from '@nestjs/common';
import {
  ConcertStatus,
  NotificationChannel,
  NotificationRecord,
  NotificationStatus,
  TicketStatus,
} from '@prisma/client';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppChannelAdapter } from './adapters/in-app-channel.adapter';
import { NotificationChannelAdapter } from './adapters/notification-channel.adapter';
import { SmtpEmailChannelAdapter } from './adapters/smtp-email-channel.adapter';

const TICKET_ISSUED_TYPE = 'TicketIssued';
const CONCERT_REMINDER_24H_TYPE = 'ConcertReminder24h';
const DEFAULT_CHANNELS = [
  NotificationChannel.in_app,
  NotificationChannel.email,
];

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly adapters: Map<
    NotificationChannel,
    NotificationChannelAdapter
  >;

  constructor(
    private readonly prisma: PrismaService,
    inAppChannel: InAppChannelAdapter,
    smtpEmailChannel: SmtpEmailChannelAdapter,
  ) {
    this.adapters = new Map(
      [inAppChannel, smtpEmailChannel].map((adapter) => [
        adapter.channel,
        adapter,
      ]),
    );
  }

  async createTicketIssuedTasks(
    orderId: string,
    ownerUserId: string,
    ticketCount: number,
  ): Promise<void> {
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
                    id: true,
                    organizationId: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const concert = order?.tickets[0]?.ticketType.concert;

    if (!concert) {
      this.logger.warn(
        formatStructuredLog('ticket_notification_skipped', {
          orderId,
          reason: 'concert_not_found',
        }),
      );
      return;
    }

    const message = `Issued ${ticketCount} ticket(s) for order ${orderId}. E-ticket is available in the app and confirmation email.`;

    await this.prisma.notificationRecord.createMany({
      data: DEFAULT_CHANNELS.map((channel) => ({
        organizationId: concert.organizationId,
        eventType: TICKET_ISSUED_TYPE,
        notificationType: TICKET_ISSUED_TYPE,
        concertId: concert.id,
        orderId,
        ownerUserId,
        ticketCount,
        channel,
        status: NotificationStatus.pending,
        idempotencyKey: `ticket-issued:${orderId}:${channel}`,
        message,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      formatStructuredLog('ticket_notification_tasks_created', {
        orderId,
        concertId: concert.id,
        channels: DEFAULT_CHANNELS,
      }),
    );
  }

  async createDueReminderTasks(now = new Date()): Promise<{
    concertsScanned: number;
    tasksCreated: number;
  }> {
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const concerts = await this.prisma.concert.findMany({
      where: {
        status: ConcertStatus.published,
        startAt: {
          gte: now,
          lte: horizon,
        },
      },
      select: {
        id: true,
        organizationId: true,
        title: true,
        startAt: true,
      },
    });

    let tasksCreated = 0;

    for (const concert of concerts) {
      const ticketOwners = await this.prisma.ticket.findMany({
        where: {
          status: TicketStatus.issued,
          ticketType: {
            concertId: concert.id,
          },
        },
        distinct: ['ownerUserId'],
        select: {
          ownerUserId: true,
        },
      });

      if (ticketOwners.length === 0) {
        continue;
      }

      const result = await this.prisma.notificationRecord.createMany({
        data: ticketOwners.flatMap(({ ownerUserId }) =>
          DEFAULT_CHANNELS.map((channel) => ({
            organizationId: concert.organizationId,
            eventType: CONCERT_REMINDER_24H_TYPE,
            notificationType: CONCERT_REMINDER_24H_TYPE,
            concertId: concert.id,
            orderId: null,
            ownerUserId,
            ticketCount: null,
            channel,
            status: NotificationStatus.pending,
            idempotencyKey: `concert-reminder-24h:${concert.id}:${ownerUserId}:${channel}`,
            scheduledFor: now,
            message: `Reminder: ${concert.title} starts at ${concert.startAt.toISOString()}.`,
          })),
        ),
        skipDuplicates: true,
      });

      tasksCreated += result.count;
    }

    return {
      concertsScanned: concerts.length,
      tasksCreated,
    };
  }

  async processDueBatch(
    now = new Date(),
    batchSize = 25,
  ): Promise<{ scanned: number; sent: number; failed: number }> {
    const tasks = await this.prisma.notificationRecord.findMany({
      where: {
        status: NotificationStatus.pending,
        scheduledFor: {
          lte: now,
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: batchSize,
    });

    let sent = 0;
    let failed = 0;

    for (const task of tasks) {
      const result = await this.processTask(task);
      if (result === 'sent') {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return {
      scanned: tasks.length,
      sent,
      failed,
    };
  }

  private async processTask(
    task: NotificationRecord,
  ): Promise<'sent' | 'failed'> {
    const adapter = this.adapters.get(task.channel);
    const processedAt = new Date();

    try {
      if (!adapter) {
        throw new Error(`unsupported notification channel: ${task.channel}`);
      }

      await adapter.send(task);

      await this.prisma.notificationRecord.updateMany({
        where: {
          id: task.id,
          status: NotificationStatus.pending,
        },
        data: {
          status: NotificationStatus.sent,
          error: null,
          processedAt,
        },
      });

      return 'sent';
    } catch (error) {
      await this.prisma.notificationRecord.updateMany({
        where: {
          id: task.id,
          status: NotificationStatus.pending,
        },
        data: {
          status: NotificationStatus.failed,
          error: error instanceof Error ? error.message : 'unknown error',
          processedAt,
        },
      });

      return 'failed';
    }
  }
}
