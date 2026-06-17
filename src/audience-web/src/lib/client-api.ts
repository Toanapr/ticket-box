"use client";

import { findConcert } from "./mock-data";
import { readMap, writeMap } from "./browser-storage";
import { serviceFee } from "./format";
import type {
  BuyerInfo,
  OrderRecord,
  ReservationErrorCode,
  ReservationRequest,
  ReservationResponse,
  TicketRecord,
} from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const ordersKey = "ticketbox.mock.orders";
const reservationsKey = "ticketbox.mock.reservations";
const ticketsKey = "ticketbox.mock.tickets";

export class ReservationApiError extends Error {
  constructor(public readonly code: ReservationErrorCode, message: string) {
    super(message);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { code?: ReservationErrorCode; message?: string };
    throw new ReservationApiError(body.code ?? "UNKNOWN", body.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function createReservation(
  payload: ReservationRequest,
  mockFailure: ReservationErrorCode | "NORMAL" = "NORMAL",
): Promise<ReservationResponse> {
  if (apiBaseUrl) {
    // TODO(Person 2 contract): remove mockFailure once POST /reservations returns canonical error body.
    return fetchJson<ReservationResponse>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  if (mockFailure !== "NORMAL") {
    throw mockError(mockFailure);
  }

  const concert = findConcert(payload.concertId);
  const ticketType = concert?.ticketTypes.find((item) => item.id === payload.ticketTypeId);
  if (!concert || !ticketType) throw mockError("UNKNOWN");
  if (concert.status !== "selling") throw mockError("SALE_NOT_OPEN");
  if (ticketType.availableApprox <= 0) throw mockError("SOLD_OUT");
  if (payload.quantity > ticketType.maxPerUser) throw mockError("QUOTA_EXCEEDED");

  const reservation: ReservationResponse = {
    reservationId: `res-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    ticketTypeId: payload.ticketTypeId,
    quantity: payload.quantity,
  };
  const reservations = readMap<ReservationResponse>(reservationsKey);
  reservations[reservation.reservationId] = reservation;
  writeMap(reservationsKey, reservations);
  return reservation;
}

export async function createOrder(input: {
  reservation: ReservationResponse;
  concertId: string;
  buyer: BuyerInfo;
  idempotencyKey: string;
}): Promise<OrderRecord> {
  if (apiBaseUrl) {
    // TODO(Person 2 contract): map payment intent fields after POST /orders is finalized.
    return fetchJson<OrderRecord>("/orders", {
      method: "POST",
      body: JSON.stringify({
        reservationId: input.reservation.reservationId,
        buyer: input.buyer,
        idempotencyKey: input.idempotencyKey,
      }),
    });
  }

  const concert = findConcert(input.concertId);
  const ticketType = concert?.ticketTypes.find((item) => item.id === input.reservation.ticketTypeId);
  if (!concert || !ticketType) throw mockError("UNKNOWN");

  const ticketTotal = ticketType.price * input.reservation.quantity;
  const totalAmount = ticketTotal + serviceFee(ticketTotal);
  const orderId = `TB-${Math.floor(100000 + Math.random() * 900000)}`;
  const order: OrderRecord = {
    orderId,
    reservationId: input.reservation.reservationId,
    concertId: concert.id,
    ticketTypeId: ticketType.id,
    quantity: input.reservation.quantity,
    buyer: input.buyer,
    status: "PENDING_PAYMENT",
    totalAmount,
    createdAt: new Date().toISOString(),
    paymentIntent: {
      provider: "mock-bank",
      bankName: "VIETCOMBANK (VCB)",
      accountNo: "9837482937",
    accountName: "CONG TY TICKETBOX VIET NAM",
      memo: orderId,
      amount: totalAmount,
    },
  };
  const orders = readMap<OrderRecord>(ordersKey);
  orders[orderId] = order;
  writeMap(ordersKey, orders);
  return order;
}

export async function getOrder(orderId: string): Promise<OrderRecord | null> {
  if (apiBaseUrl) {
    return fetchJson<OrderRecord>(`/orders/${orderId}`, { cache: "no-store" });
  }

  return readMap<OrderRecord>(ordersKey)[orderId] ?? null;
}

export async function mockPaymentSuccess(orderId: string): Promise<OrderRecord> {
  if (apiBaseUrl) {
    return fetchJson<OrderRecord>("/payments/mock-success", {
      method: "POST",
      body: JSON.stringify({ orderId }),
      cache: "no-store",
    });
  }

  const orders = readMap<OrderRecord>(ordersKey);
  const order = orders[orderId];
  if (!order) throw new Error("Order not found");

  const ticketId = `ticket-${orderId}`;
  const ticket: TicketRecord = {
    ticketId,
    orderId,
    concertId: order.concertId,
    ticketTypeId: order.ticketTypeId,
    owner: order.buyer,
    quantity: order.quantity,
    seats: Array.from({ length: order.quantity }, (_, index) => `Row J-${24 + index}`),
    qrPayload: `ticketbox://verify?ticketId=${ticketId}&orderId=${orderId}`,
    signedPayload: `mock-signed:${btoa(`${ticketId}:${orderId}:${order.ticketTypeId}`).slice(0, 48)}`,
    issuedAt: new Date().toISOString(),
    status: "issued",
  };

  orders[orderId] = { ...order, status: "TICKET_ISSUED", ticketId };
  const tickets = readMap<TicketRecord>(ticketsKey);
  tickets[ticketId] = ticket;
  writeMap(ordersKey, orders);
  writeMap(ticketsKey, tickets);
  return orders[orderId];
}

export async function markPaymentFailed(orderId: string): Promise<OrderRecord> {
  const orders = readMap<OrderRecord>(ordersKey);
  const order = orders[orderId];
  if (!order) throw new Error("Order not found");
  orders[orderId] = { ...order, status: "PAYMENT_FAILED" };
  writeMap(ordersKey, orders);
  return orders[orderId];
}

export async function getTicket(ticketId: string): Promise<TicketRecord | null> {
  if (apiBaseUrl) {
    return fetchJson<TicketRecord>(`/tickets/${ticketId}`, { cache: "no-store" });
  }

  return readMap<TicketRecord>(ticketsKey)[ticketId] ?? null;
}

function mockError(code: ReservationErrorCode): ReservationApiError {
  const messages: Record<ReservationErrorCode, string> = {
    SOLD_OUT: "Loại vé này vừa hết. Vui lòng chọn khu vực khác.",
    QUOTA_EXCEEDED: "Số lượng vé vượt hạn mức cho phép của tài khoản.",
    SALE_NOT_OPEN: "Cổng bán vé chưa mở hoặc đã đóng.",
    RESERVATION_EXPIRED: "Phiên giữ vé đã hết hạn. Vui lòng thử lại.",
    UNKNOWN: "Không thể tạo giao dịch lúc này.",
  };
  return new ReservationApiError(code, messages[code]);
}
