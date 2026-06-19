import { Injectable } from '@nestjs/common';
import { DomainError } from '../../common/errors/domain-error';
import { TicketRepository } from './ticket.repository';

@Injectable()
export class TicketService {
  constructor(private readonly ticketRepository: TicketRepository) {}

  async getTicket(userId: string, ticketId: string) {
    const ticket = await this.ticketRepository.findTicketByIdForUser(userId, ticketId);

    if (!ticket) {
      throw new DomainError('Ticket was not found', 'ticket_not_found', 404);
    }

    return {
      id: ticket.id,
      orderId: ticket.orderId,
      orderItemId: ticket.orderItemId,
      ticketTypeId: ticket.ticketTypeId,
      ownerUserId: ticket.ownerUserId,
      status: ticket.status,
      sequenceNo: ticket.sequenceNo,
      paymentStatus: ticket.order.payments[0]?.status ?? null,
      qrCode: ticket.qrToken
        ? {
            mode: 'opaque_token',
            value: ticket.qrToken,
            renderable: true,
          }
        : {
            mode: 'hash_reference',
            value: ticket.qrTokenHash,
            renderable: false,
          },
    };
  }
}
