import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationWorker } from './notification-worker.service';

describe('NotificationWorker', () => {
  it('processes a due notification batch', async () => {
    const processDueBatch = jest
      .fn()
      .mockResolvedValue({ scanned: 1, sent: 1, failed: 0 });
    const worker = new NotificationWorker(
      {
        get: (key: string) =>
          key === 'NOTIFICATION_WORKER_BATCH_SIZE' ? '5' : undefined,
      } as ConfigService,
      { processDueBatch } as unknown as NotificationService,
    );

    await worker.tick();

    expect(processDueBatch).toHaveBeenCalledWith(expect.any(Date), 5);
  });

  it('does not run when disabled', async () => {
    const processDueBatch = jest.fn();
    const worker = new NotificationWorker(
      {
        get: (key: string) =>
          key === 'NOTIFICATION_WORKER_ENABLED' ? 'false' : undefined,
      } as ConfigService,
      { processDueBatch } as unknown as NotificationService,
    );

    await worker.tick();

    expect(processDueBatch).not.toHaveBeenCalled();
  });
});
