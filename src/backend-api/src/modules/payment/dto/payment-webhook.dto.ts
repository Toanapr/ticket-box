import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class WebhookPayloadDto {
  @IsOptional()
  @IsString()
  eventType?: string;
}

export class PaymentWebhookDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  providerTxnId!: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsIn(['succeeded', 'failed'])
  status!: 'succeeded' | 'failed';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WebhookPayloadDto)
  payload?: Record<string, unknown>;
}
