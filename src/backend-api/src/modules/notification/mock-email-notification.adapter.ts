import { Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import {
  NotificationAdapter,
  NotificationDeliveryResult,
  NotificationDispatchInput,
} from './notification.types';

@Injectable()
export class MockEmailNotificationAdapter implements NotificationAdapter {
  readonly channel = NotificationChannel.email_mock;

  async send(
    input: NotificationDispatchInput,
  ): Promise<NotificationDeliveryResult> {
    return {
      channel: this.channel,
      status: NotificationStatus.sent,
      message: `Mock email queued. ${input.message}`,
    };
  }
}
