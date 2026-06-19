import { Module } from '@nestjs/common';
import { TicketController } from './ticket.controller';
import { TicketIssuanceService } from './ticket-issuance.service';
import { TicketNotificationPublisher } from './ticket-notification.publisher';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';

@Module({
  controllers: [TicketController],
  providers: [TicketService, TicketRepository, TicketIssuanceService, TicketNotificationPublisher],
  exports: [TicketService, TicketIssuanceService],
})
export class TicketModule {}
