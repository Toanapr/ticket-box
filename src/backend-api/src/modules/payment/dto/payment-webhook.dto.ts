import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

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
  providerEventId?: string;

  @IsOptional()
  @IsString()
  eventTimestamp?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsIn(['succeeded', 'failed'])
  status!: 'succeeded' | 'failed';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WebhookPayloadDto)
  payload?: Record<string, unknown>;
}
