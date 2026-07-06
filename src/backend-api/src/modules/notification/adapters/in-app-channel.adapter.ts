import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, NotificationRecord } from '@prisma/client';
import { formatStructuredLog } from '../../../common/logging/structured-log.util';
import { NotificationChannelAdapter } from './notification-channel.adapter';

@Injectable()
export class InAppChannelAdapter implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.in_app;
  private readonly logger = new Logger(InAppChannelAdapter.name);

  async send(task: NotificationRecord): Promise<void> {
    this.logger.log(
      formatStructuredLog('in_app_notification_ready', {
        notificationId: task.id,
        notificationType: task.notificationType,
        ownerUserId: task.ownerUserId,
      }),
    );
  }
}
