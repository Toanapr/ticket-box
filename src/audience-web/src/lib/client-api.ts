"use client";

import type {
  BuyerInfo,
  OrderRecord,
  ReservationErrorCode,
  ReservationRequest,
  ReservationResponse,
  PaymentMethod,
  TicketRecord,
} from "./types";

export class ReservationApiError extends Error {
  constructor(public readonly code: ReservationErrorCode, message: string) {
    super(message);
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
    }
    const body = (await response.json().catch(() => ({}))) as { code?: ReservationErrorCode; error?: string; message?: string };
    throw new ReservationApiError(normalizeErrorCode(body.code ?? body.error), body.message ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function createReservation(
  payload: ReservationRequest,
  mockFailure: ReservationErrorCode | "NORMAL" = "NORMAL",
): Promise<ReservationResponse> {
  if (mockFailure === "NORMAL") {
    const response = await fetchJson<{ id: string; expiresAt: string; ticketTypeId: string; quantity: number }>("/reservations", {
      method: "POST",
      body: JSON.stringify({
        ticketTypeId: payload.ticketTypeId,
        quantity: payload.quantity,
        idempotencyKey: payload.idempotencyKey,
      }),
    });
    return { ...response, reservationId: response.id };
  }

  throw mockError(mockFailure);
}

export async function createOrder(input: {
  reservation: ReservationResponse;
  concertId: string;
  buyer: BuyerInfo;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}): Promise<OrderRecord> {
  {
    const response = await fetchJson<{ id: string; status: string; totalAmount: string }>("/orders", {
      method: "POST",
      body: JSON.stringify({
        reservationId: input.reservation.reservationId,
        idempotencyKey: input.idempotencyKey,
      }),
    });
    return {
      orderId: response.id,
      reservationId: input.reservation.reservationId,
      concertId: input.concertId,
      ticketTypeId: input.reservation.ticketTypeId,
      quantity: input.reservation.quantity,
      buyer: input.buyer,
      status: mapOrderStatus(response.status),
      totalAmount: Number(response.totalAmount),
      createdAt: new Date().toISOString(),
      paymentIntent: {
        provider: input.paymentMethod,
        providerName: input.paymentMethod,
        memo: response.id,
        amount: Number(response.totalAmount),
      },
    };
  }
}

export async function getOrder(orderId: string): Promise<OrderRecord | null> {
  const response = await fetchJson<BackendOrder>(`/orders/${orderId}`, { cache: "no-store" });
  return mapBackendOrder(response);
}

export async function mockPaymentSuccess(orderId: string): Promise<OrderRecord> {
  await fetchJson("/payments/mock-success", {
    method: "POST",
    body: JSON.stringify({ orderId }),
    cache: "no-store",
  });
  const order = await getOrder(orderId);
  if (!order) throw new Error("Order not found");
  return order;
}

export async function getTicket(ticketId: string): Promise<TicketRecord | null> {
  const response = await fetchJson<BackendTicket>(`/tickets/${ticketId}`, { cache: "no-store" });
  return {
    ticketId: response.id,
    orderId: response.orderId,
    concertId: "",
    ticketTypeId: response.ticketTypeId,
    owner: { fullName: "Khán giả TicketBox", phone: "", email: "" },
    quantity: 1,
    seats: [`Vé #${response.sequenceNo}`],
    qrPayload: response.qrCode.value,
    signedPayload: response.qrCode.value,
    issuedAt: new Date().toISOString(),
    status: response.status,
  };
}

interface BackendOrder {
  id: string;
  status: string;
  totalAmount: string;
  reservations: Array<{ id: string; ticketTypeId: string; quantity: number }>;
  payments: Array<{ provider: string }>;
  tickets: Array<{ id: string }>;
}

interface BackendTicket {
  id: string;
  orderId: string;
  ticketTypeId: string;
  sequenceNo: number;
  status: "issued" | "revoked" | "checked_in";
  qrCode: { value: string };
}

function mapBackendOrder(order: BackendOrder): OrderRecord {
  const reservation = order.reservations[0];
  return {
    orderId: order.id,
    reservationId: reservation?.id ?? "",
    concertId: "",
    ticketTypeId: reservation?.ticketTypeId ?? "",
    quantity: reservation?.quantity ?? 0,
    buyer: { fullName: "Khán giả TicketBox", phone: "", email: "" },
    status: mapOrderStatus(order.status),
    totalAmount: Number(order.totalAmount),
    createdAt: new Date().toISOString(),
    paymentIntent: {
      provider: "VNPAY",
      providerName: order.payments[0]?.provider ?? "Mock payment",
      memo: order.id,
      amount: Number(order.totalAmount),
    },
    ticketId: order.tickets[0]?.id,
  };
}

function mapOrderStatus(status: string): OrderRecord["status"] {
  const statuses: Record<string, OrderRecord["status"]> = {
    pending_payment: "PENDING_PAYMENT",
    paid: "PAID",
    issued: "TICKET_ISSUED",
    failed: "PAYMENT_FAILED",
    expired: "EXPIRED",
    refund_required: "EXPIRED",
  };
  return statuses[status] ?? "PENDING_PAYMENT";
}

function normalizeErrorCode(code: string | undefined): ReservationErrorCode {
  const normalized = code?.toUpperCase();
  return normalized === "SOLD_OUT" || normalized === "QUOTA_EXCEEDED" || normalized === "SALE_NOT_OPEN" || normalized === "RESERVATION_EXPIRED"
    ? normalized
    : "UNKNOWN";
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
