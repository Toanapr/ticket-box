import { OrderStatus } from '../enums/order-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { ReservationStatus } from '../enums/reservation-status.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

export const reservationTransitions: Record<
  ReservationStatus,
  ReservationStatus[]
> = {
  [ReservationStatus.ACTIVE]: [
    ReservationStatus.CONFIRMED,
    ReservationStatus.RELEASED,
    ReservationStatus.EXPIRED,
  ],
  [ReservationStatus.CONFIRMED]: [],
  [ReservationStatus.RELEASED]: [],
  [ReservationStatus.EXPIRED]: [],
};

export const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAID,
    OrderStatus.ISSUED,
    OrderStatus.FAILED,
    OrderStatus.EXPIRED,
  ],
  [OrderStatus.PAID]: [OrderStatus.ISSUED],
  [OrderStatus.ISSUED]: [],
  [OrderStatus.FAILED]: [],
  [OrderStatus.EXPIRED]: [],
  [OrderStatus.REFUND_REQUIRED]: [],
};

export const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.CREATED]: [
    PaymentStatus.PENDING,
    PaymentStatus.PENDING_RECONCILIATION,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.PENDING]: [
    PaymentStatus.PENDING_RECONCILIATION,
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.PENDING_RECONCILIATION]: [
    PaymentStatus.SUCCEEDED,
    PaymentStatus.FAILED,
    PaymentStatus.EXPIRED,
  ],
  [PaymentStatus.SUCCEEDED]: [],
  [PaymentStatus.FAILED]: [],
  [PaymentStatus.EXPIRED]: [],
};

export const ticketTransitions: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.ISSUED]: [TicketStatus.REVOKED, TicketStatus.CHECKED_IN],
  [TicketStatus.REVOKED]: [],
  [TicketStatus.CHECKED_IN]: [],
};
