import {
  NotificationChannel,
  NotificationStatus,
  TicketStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppChannelAdapter } from './adapters/in-app-channel.adapter';
import { SmtpEmailChannelAdapter } from './adapters/smtp-email-channel.adapter';
import { NotificationService } from './notification.service';

const baseTask = {
  id: 'notification-id',
  organizationId: 'organization-id',
  eventType: 'TicketIssued',
  notificationType: 'TicketIssued',
  concertId: 'concert-id',
  orderId: 'order-id',
  ownerUserId: 'user-id',
  ticketCount: 2,
  channel: NotificationChannel.in_app,
  status: NotificationStatus.pending,
  idempotencyKey: 'ticket-issued:order-id:in_app',
  message: 'message',
  error: null,
  scheduledFor: new Date('2026-07-06T00:00:00.000Z'),
  processedAt: null,
  createdAt: new Date('2026-07-06T00:00:00.000Z'),
};

function createService(prisma: Partial<PrismaService>, emailFails = false) {
  const smtpEmailChannel = {
    channel: NotificationChannel.email,
    send: emailFails
      ? jest.fn().mockRejectedValue(new Error('smtp email provider failed'))
      : jest.fn().mockResolvedValue(undefined),
  } as unknown as SmtpEmailChannelAdapter;

  return new NotificationService(
    prisma as PrismaService,
    new InAppChannelAdapter(),
    smtpEmailChannel,
  );
}

describe('NotificationService ticket issued tasks', () => {
  it('creates one pending task per default channel with stable idempotency keys', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const service = createService({
      order: {
        findUnique: jest.fn().mockResolvedValue({
          tickets: [
            {
              ticketType: {
                concert: {
                  id: 'concert-id',
                  organizationId: 'organization-id',
                  title: 'Test Concert',
                },
              },
            },
          ],
        }),
      },
      notificationRecord: { createMany },
    } as unknown as PrismaService);

    await service.createTicketIssuedTasks('order-id', 'user-id', 2);

    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            channel: NotificationChannel.in_app,
            status: NotificationStatus.pending,
            idempotencyKey: 'ticket-issued:order-id:in_app',
          }),
          expect.objectContaining({
            channel: NotificationChannel.email,
            status: NotificationStatus.pending,
            idempotencyKey: 'ticket-issued:order-id:email',
          }),
        ]),
      }),
    );
  });
});

describe('NotificationService worker processing', () => {
  it('marks due pending tasks as sent when the adapter succeeds', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = createService({
      notificationRecord: {
        findMany: jest.fn().mockResolvedValue([baseTask]),
        updateMany,
      },
    } as unknown as PrismaService);

    await expect(
      service.processDueBatch(new Date('2026-07-06T00:01:00.000Z')),
    ).resolves.toMatchObject({ scanned: 1, sent: 1, failed: 0 });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseTask.id, status: NotificationStatus.pending },
        data: expect.objectContaining({
          status: NotificationStatus.sent,
          error: null,
        }),
      }),
    );
  });

  it('marks a task as failed when the adapter throws', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const service = createService(
      {
        notificationRecord: {
          findMany: jest.fn().mockResolvedValue([
            {
              ...baseTask,
              channel: NotificationChannel.email,
              idempotencyKey: 'ticket-issued:order-id:email',
            },
          ]),
          updateMany,
        },
      } as unknown as PrismaService,
      true,
    );

    await expect(
      service.processDueBatch(new Date('2026-07-06T00:01:00.000Z')),
    ).resolves.toMatchObject({ scanned: 1, sent: 0, failed: 1 });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: NotificationStatus.failed,
          error: 'smtp email provider failed',
        }),
      }),
    );
  });

  it('does not process tasks scheduled in the future', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const updateMany = jest.fn();
    const service = createService({
      notificationRecord: {
        findMany,
        updateMany,
      },
    } as unknown as PrismaService);

    await expect(
      service.processDueBatch(new Date('2026-07-06T00:00:00.000Z')),
    ).resolves.toMatchObject({ scanned: 0, sent: 0, failed: 0 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: NotificationStatus.pending,
          scheduledFor: { lte: new Date('2026-07-06T00:00:00.000Z') },
        }),
      }),
    );
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe('NotificationService reminders', () => {
  it('creates 24h reminder tasks only from published concerts with issued ticket owners', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const concertFindMany = jest.fn().mockResolvedValue([
      {
        id: 'concert-id',
        organizationId: 'organization-id',
        title: 'Test Concert',
        startAt: new Date('2026-07-07T00:00:00.000Z'),
      },
    ]);
    const ticketFindMany = jest
      .fn()
      .mockResolvedValue([{ ownerUserId: 'user-id' }]);
    const service = createService({
      concert: { findMany: concertFindMany },
      ticket: { findMany: ticketFindMany },
      notificationRecord: { createMany },
    } as unknown as PrismaService);

    await expect(
      service.createDueReminderTasks(new Date('2026-07-06T00:00:00.000Z')),
    ).resolves.toEqual({ concertsScanned: 1, tasksCreated: 2 });

    expect(concertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'published',
        }),
      }),
    );
    expect(ticketFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: TicketStatus.issued,
          ticketType: { concertId: 'concert-id' },
        }),
        distinct: ['ownerUserId'],
      }),
    );
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            notificationType: 'ConcertReminder24h',
            idempotencyKey: 'concert-reminder-24h:concert-id:user-id:in_app',
          }),
          expect.objectContaining({
            notificationType: 'ConcertReminder24h',
            idempotencyKey: 'concert-reminder-24h:concert-id:user-id:email',
          }),
        ]),
      }),
    );
  });
});
