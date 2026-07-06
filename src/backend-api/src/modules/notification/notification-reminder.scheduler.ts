import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationReminderScheduler {
  private readonly logger = new Logger(NotificationReminderScheduler.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  @Interval(60_000)
  async tick(): Promise<void> {
    if (this.running || !this.isEnabled()) {
      return;
    }

    this.running = true;
    try {
      const result = await this.notificationService.createDueReminderTasks();

      if (result.tasksCreated > 0) {
        this.logger.log(
          formatStructuredLog('notification_reminders_created', result),
        );
      }
    } finally {
      this.running = false;
    }
  }

  private isEnabled(): boolean {
    return (
      this.configService
        .get<string>('NOTIFICATION_REMINDER_SCHEDULER_ENABLED')
        ?.toLowerCase() !== 'false'
    );
  }
}
