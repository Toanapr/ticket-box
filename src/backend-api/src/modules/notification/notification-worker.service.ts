import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  @Interval(5000)
  async tick(): Promise<void> {
    if (this.running || !this.isEnabled()) {
      return;
    }

    this.running = true;
    try {
      const result = await this.notificationService.processDueBatch(
        new Date(),
        this.batchSize(),
      );

      if (result.scanned > 0) {
        this.logger.log(
          formatStructuredLog('notification_worker_batch_completed', result),
        );
      }
    } finally {
      this.running = false;
    }
  }

  private isEnabled(): boolean {
    return (
      this.configService
        .get<string>('NOTIFICATION_WORKER_ENABLED')
        ?.toLowerCase() !== 'false'
    );
  }

  private batchSize(): number {
    return Number(
      this.configService.get('NOTIFICATION_WORKER_BATCH_SIZE') ?? 25,
    );
  }
}
