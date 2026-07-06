import { NotificationChannel, NotificationRecord } from '@prisma/client';

export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  send(task: NotificationRecord): Promise<void>;
}
