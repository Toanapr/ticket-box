import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  reservationId!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsIn(['VNPAY', 'MOMO', 'mock'])
  paymentMethod?: 'VNPAY' | 'MOMO' | 'mock';
}
