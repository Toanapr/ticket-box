import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import type { NotificationAdapter } from './notification.types';

describe('NotificationDispatchService', () => {
  const createMany = jest.fn();
  const prisma = {
    notificationRecord: { createMany },
  } as unknown as PrismaService;

  const inAppAdapter: NotificationAdapter = {
    channel: NotificationChannel.in_app,
    send: jest.fn(async (input) => ({
      channel: NotificationChannel.in_app,
      status: NotificationStatus.sent,
      message: input.message,
    })),
  };

  const emailAdapter: NotificationAdapter = {
    channel: NotificationChannel.email_mock,
    send: jest.fn(async (input) => ({
      channel: NotificationChannel.email_mock,
      status: NotificationStatus.sent,
      message: `Mock email queued. ${input.message}`,
    })),
  };

  const service = new NotificationDispatchService(prisma, [
    inAppAdapter,
    emailAdapter,
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    createMany.mockResolvedValue({ count: 2 });
  });

  it('records a sent notification for every configured adapter', async () => {
    await service.dispatch({
      organizationId: 'org-id',
      eventType: 'TicketIssued',
      orderId: 'order-id',
      ownerUserId: 'user-id',
      ticketCount: 2,
      message: 'Issued 2 ticket(s) for order order-id',
    });

    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          channel: NotificationChannel.in_app,
          status: NotificationStatus.sent,
        }),
        expect.objectContaining({
          channel: NotificationChannel.email_mock,
          status: NotificationStatus.sent,
        }),
      ],
    });
  });

  it('stores failed delivery attempts without throwing back into ticket issuance', async () => {
    (emailAdapter.send as jest.Mock).mockRejectedValueOnce(
      new Error('SMTP adapter unavailable'),
    );

    await expect(
      service.dispatch({
        organizationId: 'org-id',
        eventType: 'TicketIssued',
        orderId: 'order-id',
        ownerUserId: 'user-id',
        ticketCount: 2,
        message: 'Issued 2 ticket(s) for order order-id',
      }),
    ).resolves.toBeUndefined();

    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          channel: NotificationChannel.email_mock,
          status: NotificationStatus.failed,
          error: 'SMTP adapter unavailable',
        }),
      ]),
    });
  });
});
