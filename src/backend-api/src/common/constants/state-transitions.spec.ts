import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import {
  orderTransitions,
  paymentTransitions,
  reservationTransitions,
  ticketTransitions,
} from './state-transitions';

describe('state transition maps', () => {
  it('keeps reservation terminal states locked', () => {
    expect(reservationTransitions[ReservationStatus.CONFIRMED]).toEqual([]);
    expect(reservationTransitions[ReservationStatus.RELEASED]).toEqual([]);
    expect(reservationTransitions[ReservationStatus.EXPIRED]).toEqual([]);
  });

  it('allows only forward payment transitions', () => {
    expect(paymentTransitions[PaymentStatus.CREATED]).toEqual([
      PaymentStatus.PENDING,
      PaymentStatus.SUCCEEDED,
      PaymentStatus.FAILED,
    ]);
    expect(paymentTransitions[PaymentStatus.SUCCEEDED]).toEqual([]);
    expect(paymentTransitions[PaymentStatus.FAILED]).toEqual([]);
  });

  it('keeps refund_required as terminal order state', () => {
    expect(orderTransitions[OrderStatus.REFUND_REQUIRED]).toEqual([]);
    expect(orderTransitions[OrderStatus.PENDING_PAYMENT]).toContain(OrderStatus.EXPIRED);
    expect(orderTransitions[OrderStatus.PENDING_PAYMENT]).toContain(OrderStatus.ISSUED);
  });

  it('allows issued ticket to move only to revoked or checked_in', () => {
    expect(ticketTransitions[TicketStatus.ISSUED]).toEqual([
      TicketStatus.REVOKED,
      TicketStatus.CHECKED_IN,
    ]);
    expect(ticketTransitions[TicketStatus.REVOKED]).toEqual([]);
    expect(ticketTransitions[TicketStatus.CHECKED_IN]).toEqual([]);
  });
});
