import { ConfigService } from '@nestjs/config';
import { NotificationReminderScheduler } from './notification-reminder.scheduler';
import { NotificationService } from './notification.service';

describe('NotificationReminderScheduler', () => {
  it('creates due reminder tasks', async () => {
    const createDueReminderTasks = jest
      .fn()
      .mockResolvedValue({ concertsScanned: 1, tasksCreated: 2 });
    const scheduler = new NotificationReminderScheduler(
      { get: jest.fn() } as unknown as ConfigService,
      { createDueReminderTasks } as unknown as NotificationService,
    );

    await scheduler.tick();

    expect(createDueReminderTasks).toHaveBeenCalledTimes(1);
  });

  it('does not run when disabled', async () => {
    const createDueReminderTasks = jest.fn();
    const scheduler = new NotificationReminderScheduler(
      {
        get: (key: string) =>
          key === 'NOTIFICATION_REMINDER_SCHEDULER_ENABLED'
            ? 'false'
            : undefined,
      } as ConfigService,
      { createDueReminderTasks } as unknown as NotificationService,
    );

    await scheduler.tick();

    expect(createDueReminderTasks).not.toHaveBeenCalled();
  });
});
