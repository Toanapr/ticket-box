import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TicketService } from './ticket.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles('audience')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get(':id')
  async getTicket(
    @CurrentUser() user: CurrentUser,
    @Param('id') ticketId: string,
  ) {
    return this.ticketService.getTicket(user.sub, ticketId);
  }
}
