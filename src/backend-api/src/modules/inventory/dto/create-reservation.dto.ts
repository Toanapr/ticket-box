import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  ticketTypeId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  quantity!: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
