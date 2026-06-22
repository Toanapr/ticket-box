import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  reservationId!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
