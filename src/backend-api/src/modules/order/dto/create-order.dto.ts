import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderBuyerDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class CreateOrderDto {
  @IsUUID()
  reservationId!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsOptional()
  @IsIn(['VNPAY', 'mock'])
  paymentMethod?: 'VNPAY' | 'mock';

  @IsObject()
  @ValidateNested()
  @Type(() => CreateOrderBuyerDto)
  buyer!: CreateOrderBuyerDto;
}
