import { OrderStatus, Prisma, TicketStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { buildQrToken, hashQrToken } from '../../common/utils/qr-token.util';
import { TicketNotificationPublisher } from './ticket-notification.publisher';
import { TicketRepository } from './ticket.repository';

@Injectable()
export class TicketIssuanceService {
  constructor(
    private readonly ticketRepository: TicketRepository,
    private readonly ticketNotificationPublisher: TicketNotificationPublisher,
  ) {}

  async issueTicketsForOrder(
    tx: Prisma.TransactionClient,
    orderId: string,
    ownerUserId: string,
  ): Promise<{ issuedTicketCount: number; createdNow: boolean }> {
    const orderItems = await this.ticketRepository.findOrderItems(tx, orderId);
    let createdNow = false;

    for (const item of orderItems) {
      const existingSequenceSet =
        await this.ticketRepository.findExistingSequenceSet(tx, item.id);

      for (let sequenceNo = 1; sequenceNo <= item.quantity; sequenceNo += 1) {
        if (existingSequenceSet.has(sequenceNo)) {
          continue;
        }

        const qrToken = buildQrToken(orderId, item.id, sequenceNo);

        await this.ticketRepository.createIssuedTicket(tx, {
          orderId,
          orderItemId: item.id,
          ticketTypeId: item.ticketTypeId,
          ownerUserId,
          qrToken,
          qrTokenHash: hashQrToken(qrToken),
          sequenceNo,
          status: TicketStatus.issued,
        });

        createdNow = true;
      }
    }

    await this.ticketRepository.updateOrderStatus(
      tx,
      orderId,
      OrderStatus.issued,
    );

    return {
      issuedTicketCount: await this.ticketRepository.countTicketsByOrderId(
        tx,
        orderId,
      ),
      createdNow,
    };
  }

  async notifyIssuedTickets(
    orderId: string,
    ownerUserId: string,
    ticketCount: number,
  ): Promise<void> {
    await this.ticketNotificationPublisher.publishTicketIssued(
      orderId,
      ownerUserId,
      ticketCount,
    );
  }
}
