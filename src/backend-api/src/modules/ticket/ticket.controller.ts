import { BadRequestException, Controller, Get, Headers, Param } from '@nestjs/common';
import { TicketService } from './ticket.service';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get(':id')
  async getTicket(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') ticketId: string,
  ) {
    return this.ticketService.getTicket(this.requireUserId(userId), ticketId);
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
