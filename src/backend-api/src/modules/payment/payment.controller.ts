import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  UnauthorizedException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyWebhookSignature } from '../../common/utils/webhook-signature.util';
import { MockPaymentSuccessDto } from './dto/mock-payment-success.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('mock-success')
  async mockSuccess(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: MockPaymentSuccessDto,
  ) {
    return this.paymentService.mockSuccess(this.requireUserId(userId), dto);
  }

  @Post('webhook')
  async webhook(
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    this.verifySignatureIfConfigured(signature, dto);
    return this.paymentService.processWebhook(dto);
  }

  private requireUserId(userId: string | undefined): string {
    const uuidV4Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!userId || !uuidV4Pattern.test(userId)) {
      throw new BadRequestException({
        error: 'invalid_user_id',
        message: 'x-user-id header must be a valid UUID v4',
      });
    }

    return userId;
  }

  private verifySignatureIfConfigured(
    signature: string | undefined,
    payload: PaymentWebhookDto,
  ): void {
    const secret =
      process.env.WEBHOOK_SIGNING_SECRET ??
      this.configService.get<string>('WEBHOOK_SIGNING_SECRET');

    if (!secret) {
      return;
    }

    if (!verifyWebhookSignature(secret, payload, signature)) {
      throw new UnauthorizedException({
        error: 'invalid_webhook_signature',
        message: 'Webhook signature verification failed',
      });
    }
  }
}
