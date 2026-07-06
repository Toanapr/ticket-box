import { NotificationChannel, NotificationStatus } from '@prisma/client';

export interface NotificationDispatchInput {
  organizationId: string;
  eventType: string;
  orderId: string;
  ownerUserId: string;
  ticketCount: number;
  message: string;
}

export interface NotificationDeliveryResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  error?: string;
}

export interface NotificationAdapter {
  readonly channel: NotificationChannel;
  send(input: NotificationDispatchInput): Promise<NotificationDeliveryResult>;
}

export const NOTIFICATION_ADAPTERS = Symbol('NOTIFICATION_ADAPTERS');
