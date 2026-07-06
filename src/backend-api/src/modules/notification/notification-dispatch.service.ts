import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NOTIFICATION_ADAPTERS,
  NotificationAdapter,
  NotificationDispatchInput,
} from './notification.types';

@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_ADAPTERS)
    private readonly adapters: NotificationAdapter[],
  ) {}

  async dispatch(input: NotificationDispatchInput): Promise<void> {
    const records = [];

    for (const adapter of this.adapters) {
      try {
        const result = await adapter.send(input);
        records.push({
          organizationId: input.organizationId,
          eventType: input.eventType,
          orderId: input.orderId,
          ownerUserId: input.ownerUserId,
          ticketCount: input.ticketCount,
          channel: result.channel,
          status: result.status,
          message: result.message,
          error: result.error ?? null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        records.push({
          organizationId: input.organizationId,
          eventType: input.eventType,
          orderId: input.orderId,
          ownerUserId: input.ownerUserId,
          ticketCount: input.ticketCount,
          channel: adapter.channel,
          status: NotificationStatus.failed,
          message: input.message,
          error: message,
        });
        this.logger.warn(
          formatStructuredLog('notification_delivery_failed', {
            orderId: input.orderId,
            ownerUserId: input.ownerUserId,
            channel: adapter.channel,
            error: message,
          }),
        );
      }
    }

    await this.prisma.notificationRecord.createMany({ data: records });

    this.logger.log(
      formatStructuredLog('notification_dispatch_recorded', {
        orderId: input.orderId,
        ownerUserId: input.ownerUserId,
        channels: records.map((record) => record.channel),
      }),
    );
  }
}
