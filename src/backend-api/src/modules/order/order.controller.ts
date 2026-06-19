import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(this.requireUserId(userId), dto);
  }

  @Get(':id')
  async getOrder(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') orderId: string,
  ) {
    return this.orderService.getOrder(this.requireUserId(userId), orderId);
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
