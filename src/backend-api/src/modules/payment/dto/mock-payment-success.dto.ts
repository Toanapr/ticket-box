import { IsUUID } from 'class-validator';

export class MockPaymentSuccessDto {
  @IsUUID()
  orderId!: string;
}
