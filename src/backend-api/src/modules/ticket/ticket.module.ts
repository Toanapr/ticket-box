import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { TicketController } from './ticket.controller';
import { TicketIssuanceService } from './ticket-issuance.service';
import { TicketNotificationPublisher } from './ticket-notification.publisher';
import { TicketRepository } from './ticket.repository';
import { TicketService } from './ticket.service';
import { AuthModule } from '../auth/auth.module';
import { ScannerModule } from '../scanner/scanner.module';

@Module({
  imports: [AuthModule, NotificationModule, ScannerModule],
  controllers: [TicketController],
  providers: [
    TicketService,
    TicketRepository,
    TicketIssuanceService,
    TicketNotificationPublisher,
  ],
  exports: [TicketService, TicketIssuanceService],
})
export class TicketModule {}
