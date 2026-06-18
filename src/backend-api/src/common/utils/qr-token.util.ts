import { createHash, randomUUID } from 'crypto';

export function buildQrToken(orderId: string, orderItemId: string, sequenceNo: number): string {
  return `${orderId}:${orderItemId}:${sequenceNo}:${randomUUID()}`;
}

export function hashQrToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
