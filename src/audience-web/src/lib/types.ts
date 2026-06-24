export type ConcertStatus = "selling" | "upcoming" | "soldout";

export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PAYMENT_FAILED"
  | "EXPIRED"
  | "TICKET_ISSUED";

export type ReservationErrorCode =
  | "SOLD_OUT"
  | "QUOTA_EXCEEDED"
  | "SALE_NOT_OPEN"
  | "RESERVATION_EXPIRED"
  | "UNKNOWN";

export interface TicketType {
  id: string;
  slug: string;
  zone: "svip" | "vip" | "cat1" | "cat2" | "ga";
  name: string;
  price: number;
  maxPerUser: number;
  availableApprox: number;
  capacity: number;
  saleStartsAt: string;
  saleEndsAt: string;
}

export interface ConcertSummary {
  id: string;
  slug: string;
  title: string;
  artists: string[];
  venue: string;
  startsAt: string;
  status: ConcertStatus;
  description: string;
  posterPath?: string;
}

export interface ConcertDetail extends ConcertSummary {
  ticketTypes: TicketType[];
  seatingMapVersion: string;
}

export interface BuyerInfo {
  fullName: string;
  phone: string;
  email: string;
}

export type PaymentMethod = "VNPAY" | "MOMO";

export interface ReservationRequest {
  concertId: string;
  ticketTypeId: string;
  quantity: number;
  idempotencyKey: string;
}

export interface ReservationResponse {
  reservationId: string;
  expiresAt: string;
  ticketTypeId: string;
  quantity: number;
}

export interface OrderRecord {
  orderId: string;
  reservationId: string;
  concertId: string;
  ticketTypeId: string;
  quantity: number;
  buyer: BuyerInfo;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  paymentIntent?: {
    provider: PaymentMethod | "mock-bank";
    providerName?: string;
    bankName?: string;
    accountNo?: string;
    accountName?: string;
    qrPayload?: string;
    memo: string;
    amount: number;
  };
  ticketId?: string;
}

export interface TicketRecord {
  ticketId: string;
  orderId: string;
  concertId: string;
  ticketTypeId: string;
  owner: BuyerInfo;
  quantity: number;
  seats: string[];
  qrPayload: string;
  signedPayload: string;
  issuedAt: string;
  status: "issued" | "revoked" | "checked_in";
}
