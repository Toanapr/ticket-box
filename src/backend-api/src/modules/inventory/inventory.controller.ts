import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
} from '@nestjs/common';
import { RateLimit } from '../../common/cache/rate-limit.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { InventoryService } from './inventory.service';

@Controller('reservations')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @RateLimit([
    { scope: 'ip', limit: 30, windowSeconds: 60 },
    { scope: 'user', limit: 10, windowSeconds: 60 },
    { scope: 'device', limit: 20, windowSeconds: 60 },
  ])
  async createReservation(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateReservationDto,
  ) {
    return this.inventoryService.createReservation(
      this.requireUserId(userId),
      dto,
    );
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
