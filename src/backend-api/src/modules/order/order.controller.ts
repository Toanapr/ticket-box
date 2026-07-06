import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles('audience')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @CurrentUser() user: CurrentUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(user.sub, dto);
  }

  @Get(':id')
  async getOrder(
    @CurrentUser() user: CurrentUser,
    @Param('id') orderId: string,
  ) {
    return this.orderService.getOrder(user.sub, orderId);
  }
}
