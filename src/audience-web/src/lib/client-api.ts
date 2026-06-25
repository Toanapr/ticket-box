"use client";

import type {
  BuyerInfo,
  CheckoutTransientError,
  OrderRecord,
  ReservationErrorCode,
  ReservationRequest,
  ReservationResponse,
  PaymentMethod,
  PaymentProvider,
  TicketRecord,
} from "./types";

export class ReservationApiError extends Error {
  constructor(
    public readonly code: ReservationErrorCode,
    message: string,
    public readonly transient: CheckoutTransientError,
  ) {
    super(message);
  }
}

interface FetchJsonOptions {
  onResponse?: (response: Response) => void;
}

async function fetchJson<T>(path: string, init?: RequestInit, options: FetchJsonOptions = {}): Promise<T> {
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
    throw await createReservationApiError(response);
  }

  options.onResponse?.(response);
  return response.json() as Promise<T>;
}

export async function createReservation(
  payload: ReservationRequest,
  mockFailure: ReservationErrorCode | "NORMAL" = "NORMAL",
): Promise<ReservationResponse> {
  if (mockFailure === "NORMAL") {
    let saleAccessTokenFromHeader: string | undefined;
    let saleAccessTokenExpiresAtFromHeader: string | undefined;
    const response = await fetchJson<{
      id: string;
      expiresAt: string;
      ticketTypeId: string;
      quantity: number;
      saleAccessToken?: string;
      saleAccessTokenExpiresAt?: string;
    }>(
      "/reservations",
      {
        method: "POST",
        headers: payload.saleAccessToken ? { "x-sale-access-token": payload.saleAccessToken } : undefined,
        body: JSON.stringify({
          ticketTypeId: payload.ticketTypeId,
          quantity: payload.quantity,
          idempotencyKey: payload.idempotencyKey,
        }),
      },
      {
        onResponse: (apiResponse) => {
          saleAccessTokenFromHeader = apiResponse.headers.get("x-sale-access-token") ?? undefined;
          saleAccessTokenExpiresAtFromHeader = apiResponse.headers.get("x-sale-access-expires-at") ?? undefined;
        },
      },
    );
    return {
      ...response,
      reservationId: response.id,
      saleAccessToken: response.saleAccessToken ?? saleAccessTokenFromHeader,
      saleAccessTokenExpiresAt: response.saleAccessTokenExpiresAt ?? saleAccessTokenExpiresAtFromHeader,
    };
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
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    providerTxnId: string | null;
    checkoutUrl?: string | null;
  }>;
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
  const payment = order.payments[0];
  const ticketId = order.tickets[0]?.id;
  return {
    orderId: order.id,
    reservationId: reservation?.id ?? "",
    concertId: "",
    ticketTypeId: reservation?.ticketTypeId ?? "",
    quantity: reservation?.quantity ?? 0,
    buyer: { fullName: "Khán giả TicketBox", phone: "", email: "" },
    status: mapOrderAndPaymentStatus(order.status, payment?.status, Boolean(ticketId)),
    totalAmount: Number(order.totalAmount),
    createdAt: new Date().toISOString(),
    paymentIntent: {
      paymentId: payment?.id,
      provider: normalizePaymentProvider(payment?.provider),
      providerName: payment?.provider ?? "Mock payment",
      status: payment?.status,
      providerTxnId: payment?.providerTxnId,
      checkoutUrl: payment?.checkoutUrl ?? null,
      memo: order.id,
      amount: Number(order.totalAmount),
    },
    ticketId,
  };
}

function mapOrderAndPaymentStatus(orderStatus: string, paymentStatus: string | undefined, hasTicket: boolean): OrderRecord["status"] {
  if (hasTicket) return "TICKET_ISSUED";
  const paymentMapped = paymentStatus ? mapPaymentStatus(paymentStatus) : undefined;
  if (paymentMapped && orderStatus === "pending_payment") return paymentMapped;
  return mapOrderStatus(orderStatus);
}

function mapOrderStatus(status: string): OrderRecord["status"] {
  const statuses: Record<string, OrderRecord["status"]> = {
    pending_payment: "PENDING_PAYMENT",
    payment_pending: "PENDING_PAYMENT",
    payment_degraded: "PAYMENT_DEGRADED",
    payment_circuit_open: "PAYMENT_DEGRADED",
    circuit_open: "PAYMENT_DEGRADED",
    payment_pending_reconciliation: "PAYMENT_PENDING_RECONCILIATION",
    pending_reconciliation: "PAYMENT_PENDING_RECONCILIATION",
    paid: "PAID",
    issued: "TICKET_ISSUED",
    ticket_issued: "TICKET_ISSUED",
    failed: "PAYMENT_FAILED",
    payment_failed: "PAYMENT_FAILED",
    expired: "PAYMENT_EXPIRED",
    payment_expired: "PAYMENT_EXPIRED",
    refund_required: "PAYMENT_PENDING_RECONCILIATION",
  };
  return statuses[status] ?? "PENDING_PAYMENT";
}

function mapPaymentStatus(status: string): OrderRecord["status"] | undefined {
  const statuses: Record<string, OrderRecord["status"]> = {
    created: "PENDING_PAYMENT",
    pending: "PENDING_PAYMENT",
    pending_reconciliation: "PAYMENT_PENDING_RECONCILIATION",
    succeeded: "PAID",
    failed: "PAYMENT_FAILED",
    expired: "PAYMENT_EXPIRED",
  };
  return statuses[status];
}

function normalizePaymentProvider(provider: string | undefined): PaymentProvider {
  if (provider === "VNPAY" || provider === "MOMO" || provider === "mock" || provider === "mock-bank") return provider;
  return "mock";
}

export function normalizeErrorCode(code: string | undefined): ReservationErrorCode {
  const normalized = code?.toUpperCase();
  return normalized === "SOLD_OUT" ||
    normalized === "QUOTA_EXCEEDED" ||
    normalized === "SALE_NOT_OPEN" ||
    normalized === "RESERVATION_EXPIRED" ||
    normalized === "RATE_LIMITED" ||
    normalized === "OVERLOADED" ||
    normalized === "SALE_ACCESS_REQUIRED" ||
    normalized === "SALE_TOKEN_EXPIRED" ||
    normalized === "PAYMENT_DEGRADED" ||
    normalized === "PAYMENT_PENDING_RECONCILIATION" ||
    normalized === "IDEMPOTENCY_CONFLICT"
    ? normalized
    : "UNKNOWN";
}

export function parseRetryAfter(value: string | null, now = new Date()): Pick<CheckoutTransientError, "retryAfterMs" | "retryAt"> {
  if (!value) return {};
  const numericSeconds = Number(value);
  if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
    const retryAfterMs = Math.round(numericSeconds * 1000);
    return { retryAfterMs, retryAt: new Date(now.getTime() + retryAfterMs).toISOString() };
  }

  const retryAtMs = Date.parse(value);
  if (Number.isNaN(retryAtMs)) return {};
  const retryAfterMs = Math.max(0, retryAtMs - now.getTime());
  return { retryAfterMs, retryAt: new Date(now.getTime() + retryAfterMs).toISOString() };
}

async function createReservationApiError(response: Response): Promise<ReservationApiError> {
  const body = (await response.json().catch(() => ({}))) as { code?: string; error?: string; message?: string };
  const code = normalizeErrorCode(body.code ?? body.error);
  const retry = parseRetryAfter(response.headers.get("retry-after"));
  const transient: CheckoutTransientError = {
    kind: transientKindFor(response.status, code),
    status: response.status,
    code,
    message: body.message ?? defaultErrorMessage(response.status, code),
    correlationId: response.headers.get("x-correlation-id") ?? undefined,
    ...retry,
  };
  return new ReservationApiError(code, transient.message, transient);
}

function transientKindFor(status: number, code: ReservationErrorCode): CheckoutTransientError["kind"] {
  if (status === 429 || code === "RATE_LIMITED") return "rate-limit";
  if (status === 503 || code === "OVERLOADED") return "overload";
  if (code === "SALE_TOKEN_EXPIRED") return "sale-token-expired";
  if (code === "SALE_ACCESS_REQUIRED") return "sale-access-required";
  if (code === "IDEMPOTENCY_CONFLICT") return "idempotency-conflict";
  return "backend-error";
}

function defaultErrorMessage(status: number, code: ReservationErrorCode): string {
  if (status === 429 || code === "RATE_LIMITED") return "Bạn thao tác quá nhanh. Vui lòng thử lại sau thời gian backend yêu cầu.";
  if (status === 503 || code === "OVERLOADED") return "Hệ thống đang quá tải. Đây không phải tín hiệu hết vé.";
  if (code === "SALE_TOKEN_EXPIRED") return "Token vào sale đã hết hạn. Vui lòng vào lại hàng chờ.";
  if (code === "SALE_ACCESS_REQUIRED") return "Bạn cần được backend cho vào sale trước khi checkout.";
  return "Request failed";
}

function mockError(code: ReservationErrorCode): ReservationApiError {
  const messages: Record<ReservationErrorCode, string> = {
    SOLD_OUT: "Loại vé này vừa hết. Vui lòng chọn khu vực khác.",
    QUOTA_EXCEEDED: "Số lượng vé vượt hạn mức cho phép của tài khoản.",
    SALE_NOT_OPEN: "Cổng bán vé chưa mở hoặc đã đóng.",
    RESERVATION_EXPIRED: "Phiên giữ vé đã hết hạn. Vui lòng thử lại.",
    RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại theo Retry-After.",
    OVERLOADED: "Hệ thống đang quá tải. Vui lòng thử lại sau.",
    SALE_ACCESS_REQUIRED: "Bạn cần vào hàng chờ trước khi checkout.",
    SALE_TOKEN_EXPIRED: "Token vào sale đã hết hạn. Vui lòng vào lại hàng chờ.",
    PAYMENT_DEGRADED: "Cổng thanh toán đang gián đoạn.",
    PAYMENT_PENDING_RECONCILIATION: "Thanh toán đang chờ đối soát.",
    IDEMPOTENCY_CONFLICT: "Request checkout đã thay đổi. Vui lòng bắt đầu lại.",
    UNKNOWN: "Không thể tạo giao dịch lúc này.",
  };
  return new ReservationApiError(code, messages[code], {
    kind: code === "OVERLOADED" ? "overload" : code === "RATE_LIMITED" ? "rate-limit" : "backend-error",
    status: 400,
    code,
    message: messages[code],
  });
}
