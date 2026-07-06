import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InAppNotificationAdapter } from './in-app-notification.adapter';
import { MockEmailNotificationAdapter } from './mock-email-notification.adapter';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NOTIFICATION_ADAPTERS } from './notification.types';

@Module({
  imports: [PrismaModule],
  providers: [
    InAppNotificationAdapter,
    MockEmailNotificationAdapter,
    NotificationDispatchService,
    {
      provide: NOTIFICATION_ADAPTERS,
      inject: [InAppNotificationAdapter, MockEmailNotificationAdapter],
      useFactory: (
        inApp: InAppNotificationAdapter,
        email: MockEmailNotificationAdapter,
      ) => [inApp, email],
    },
  ],
  exports: [NotificationDispatchService],
})
export class NotificationModule {}
