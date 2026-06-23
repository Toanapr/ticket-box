import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Res,
  UnauthorizedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { verifyWebhookSignature } from '../../common/utils/webhook-signature.util';
import { MockPaymentSuccessDto } from './dto/mock-payment-success.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentService } from './payment.service';
import { PaymentIntentService } from './payment-intent.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
    private readonly paymentIntentService: PaymentIntentService,
  ) {}

  @Post(':paymentId/intent')
  @HttpCode(201)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('audience')
  async createIntent(
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: CurrentUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException({
        error: 'idempotency_key_required',
        message: 'Idempotency-Key header is required',
      });
    }
    const result = await this.paymentIntentService.create(
      user.sub,
      paymentId,
      idempotencyKey,
    );
    response.status(result.httpStatus);
    if (result.retryAfterSeconds)
      response.setHeader('Retry-After', result.retryAfterSeconds);
    return result.body;
  }

  @Post('mock-success')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('audience')
  async mockSuccess(
    @CurrentUser() user: CurrentUser,
    @Body() dto: MockPaymentSuccessDto,
  ) {
    return this.paymentService.mockSuccess(user.sub, dto);
  }

  @Post('webhook')
  async webhook(
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    this.verifySignatureIfConfigured(signature, dto);
    return this.paymentService.processWebhook(dto);
  }

  private verifySignatureIfConfigured(
    signature: string | undefined,
    payload: PaymentWebhookDto,
  ): void {
    const secret =
      process.env.WEBHOOK_SIGNING_SECRET ??
      this.configService.get<string>('WEBHOOK_SIGNING_SECRET');

    if (!secret && process.env.NODE_ENV === 'test') {
      return;
    }

    if (!secret) {
      throw new UnauthorizedException({
        error: 'webhook_signing_not_configured',
        message: 'Webhook signing is not configured',
      });
    }

    if (!verifyWebhookSignature(secret, payload, signature)) {
      throw new UnauthorizedException({
        error: 'invalid_webhook_signature',
        message: 'Webhook signature verification failed',
      });
    }
  }
}
