import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { MockPaymentSuccessDto } from './dto/mock-payment-success.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('mock-success')
  async mockSuccess(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: MockPaymentSuccessDto,
  ) {
    return this.paymentService.mockSuccess(this.requireUserId(userId), dto);
  }

  @Post('webhook')
  async webhook(@Body() dto: PaymentWebhookDto) {
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
}
