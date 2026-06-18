import { Injectable } from '@nestjs/common';
import { createStableHash } from '../../common/utils/hash.util';
import { MockPaymentSuccessDto } from './dto/mock-payment-success.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentRepository } from './payment.repository';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async mockSuccess(userId: string, dto: MockPaymentSuccessDto) {
    return this.paymentRepository.confirmMockPayment(userId, dto.orderId);
  }

  async processWebhook(dto: PaymentWebhookDto) {
    const payloadHash = createStableHash({
      orderId: dto.orderId,
      provider: dto.provider ?? 'mock',
      providerTxnId: dto.providerTxnId,
      status: dto.status,
      payload: dto.payload ?? null,
    });

    return this.paymentRepository.processWebhook({
      orderId: dto.orderId,
      provider: dto.provider ?? 'mock',
      providerTxnId: dto.providerTxnId,
      status: dto.status,
      payloadHash,
    });
  }
}
