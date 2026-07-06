import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import {
  NotificationAdapter,
  NotificationDeliveryResult,
  NotificationDispatchInput,
} from './notification.types';

@Injectable()
export class InAppNotificationAdapter implements NotificationAdapter {
  readonly channel = NotificationChannel.in_app;

  async send(
    input: NotificationDispatchInput,
  ): Promise<NotificationDeliveryResult> {
    return {
      channel: this.channel,
      status: NotificationStatus.sent,
      message: input.message,
    };
  }
}
