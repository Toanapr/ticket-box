import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RateLimit } from '../../common/cache/rate-limit.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { InventoryService } from './inventory.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles('audience')
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
    @CurrentUser() user: CurrentUser,
    @Body() dto: CreateReservationDto,
  ) {
    return this.inventoryService.createReservation(user.sub, dto);
  }
}
