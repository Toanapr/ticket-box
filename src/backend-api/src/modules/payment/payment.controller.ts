import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Query,
  Res,
  UnauthorizedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { DomainError } from '../../common/errors/domain-error';
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

  @Get('vnpay/return')
  async vnpayReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.paymentService.processVnpayReturn(query);
    return response.redirect(302, redirectUrl);
  }

  @Get('vnpay/ipn')
  async vnpayIpn(
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    try {
      await this.paymentService.processVnpayIpn(query);
      return { RspCode: '00', Message: 'Confirm Success' };
    } catch (error) {
      return this.toVnpayIpnError(error);
    }
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

  private toVnpayIpnError(error: unknown): {
    RspCode: string;
    Message: string;
  } {
    if (!(error instanceof DomainError)) {
      return { RspCode: '99', Message: 'Unknown error' };
    }
    if (error.code === 'payment_return_invalid_signature') {
      return { RspCode: '97', Message: 'Invalid signature' };
    }
    if (error.code === 'payment_not_found') {
      return { RspCode: '01', Message: 'Order not found' };
    }
    if (error.code === 'payment_amount_mismatch') {
      return { RspCode: '04', Message: 'Invalid amount' };
    }
    return { RspCode: '99', Message: error.message };
  }
}
