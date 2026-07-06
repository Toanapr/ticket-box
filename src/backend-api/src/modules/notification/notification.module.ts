import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InAppChannelAdapter } from './adapters/in-app-channel.adapter';
import { SmtpEmailChannelAdapter } from './adapters/smtp-email-channel.adapter';
import { NotificationReminderScheduler } from './notification-reminder.scheduler';
import { NotificationWorker } from './notification-worker.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule],
  providers: [
    NotificationService,
    NotificationWorker,
    NotificationReminderScheduler,
    InAppChannelAdapter,
    SmtpEmailChannelAdapter,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
