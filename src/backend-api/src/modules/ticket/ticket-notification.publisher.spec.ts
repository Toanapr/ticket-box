import { Logger } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { TicketNotificationPublisher } from './ticket-notification.publisher';

describe('TicketNotificationPublisher', () => {
  const createTicketIssuedTasks = jest.fn();
  let loggerErrorSpy: jest.SpyInstance;
  const publisher = new TicketNotificationPublisher({
    createTicketIssuedTasks,
  } as unknown as NotificationService);

  beforeAll(() => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    loggerErrorSpy.mockRestore();
  });

  it('creates pending notification tasks after tickets are issued', async () => {
    await publisher.publishTicketIssued('order-id', 'user-id', 2);

    expect(createTicketIssuedTasks).toHaveBeenCalledWith(
      'order-id',
      'user-id',
      2,
    );
  });

  it('does not throw when notification task creation fails', async () => {
    createTicketIssuedTasks.mockRejectedValueOnce(new Error('db failed'));

    await expect(
      publisher.publishTicketIssued('order-id', 'user-id', 2),
    ).resolves.toBeUndefined();
  });
});
