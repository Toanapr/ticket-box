import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOrder,
  createPaymentIntent,
  createReservation,
  getOrder,
  getTicket,
  normalizeErrorCode,
  parseRetryAfter,
  ReservationApiError,
} from "./client-api";

describe("client API transient errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses Retry-After seconds into an absolute retry timestamp", () => {
    expect(parseRetryAfter("30", new Date("2026-07-15T00:00:00.000Z"))).toEqual(
      {
        retryAfterMs: 30_000,
        retryAt: "2026-07-15T00:00:30.000Z",
      },
    );
  });

  it("parses Retry-After HTTP dates and clamps past dates", () => {
    expect(
      parseRetryAfter(
        "Wed, 15 Jul 2026 00:01:00 GMT",
        new Date("2026-07-15T00:00:00.000Z"),
      ),
    ).toEqual({
      retryAfterMs: 60_000,
      retryAt: "2026-07-15T00:01:00.000Z",
    });
    expect(
      parseRetryAfter(
        "Wed, 15 Jul 2026 00:00:00 GMT",
        new Date("2026-07-15T00:01:00.000Z"),
      ),
    ).toEqual({
      retryAfterMs: 0,
      retryAt: "2026-07-15T00:01:00.000Z",
    });
  });

  it("normalizes flash-sale backend codes", () => {
    expect(normalizeErrorCode("rate_limited")).toBe("RATE_LIMITED");
    expect(normalizeErrorCode("sale_token_expired")).toBe("SALE_TOKEN_EXPIRED");
    expect(normalizeErrorCode("unknown_new_code")).toBe("UNKNOWN");
  });

  it("exposes status, retry metadata, and backend code for 429 reservation responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: "RATE_LIMITED", message: "Too many reservation attempts" },
            {
              status: 429,
              headers: { "retry-after": "45", "x-correlation-id": "corr-1" },
            },
          ),
        ),
    );

    await expect(
      createReservation({
        concertId: "concert-1",
        ticketTypeId: "ticket-1",
        quantity: 1,
        idempotencyKey: "reservation-key",
      }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      transient: expect.objectContaining({
        kind: "rate-limit",
        status: 429,
        retryAfterMs: 45_000,
        correlationId: "corr-1",
      }),
    });
  });

  it("attaches sale access token to reservation requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "reservation-1",
        expiresAt: "2026-07-15T00:10:00.000Z",
        ticketTypeId: "ticket-1",
        quantity: 1,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createReservation({
      concertId: "concert-1",
      ticketTypeId: "ticket-1",
      quantity: 1,
      idempotencyKey: "reservation-key",
      saleAccessToken: "sale-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/reservations",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-sale-access-token": "sale-token",
        }),
      }),
    );
  });

  it("sends buyer contact and captures order metadata from create order response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "order-1",
        status: "pending_payment",
        totalAmount: "250000",
        paymentId: "payment-1",
        concertId: "concert-1",
        concertTitle: "Summer Tour",
        venue: "TicketBox Arena, Ho Chi Minh City",
        ticketTypeId: "ticket-1",
        ticketTypeName: "VIP",
        quantity: 2,
        buyer: {
          fullName: "Nguyen Van A",
          phone: "0909",
          email: "ticket-recipient@test.local",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const buyer = {
      fullName: "Nguyen Van A",
      phone: "0909",
      email: "ticket-recipient@test.local",
    };

    await expect(
      createOrder({
        reservation: {
          reservationId: "reservation-1",
          expiresAt: "2026-07-15T00:10:00.000Z",
          ticketTypeId: "ticket-1",
          quantity: 2,
        },
        concertId: "concert-1",
        buyer,
        paymentMethod: "VNPAY",
        idempotencyKey: "order-key",
      }),
    ).resolves.toMatchObject({
      orderId: "order-1",
      concertId: "concert-1",
      concertTitle: "Summer Tour",
      venue: "TicketBox Arena, Ho Chi Minh City",
      ticketTypeId: "ticket-1",
      ticketTypeName: "VIP",
      quantity: 2,
      buyer,
      paymentIntent: {
        paymentId: "payment-1",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          reservationId: "reservation-1",
          idempotencyKey: "order-key",
          paymentMethod: "VNPAY",
          buyer,
        }),
      }),
    );
  });

  it("sends Idempotency-Key and preserves degraded payment intent retry metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          paymentId: "payment-1",
          orderId: "order-1",
          status: "pending",
          checkoutUrl: null,
          degraded: true,
          reason: "provider_unavailable",
          retryAfterSeconds: 30,
        },
        { status: 503, headers: { "retry-after": "30" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createPaymentIntent({
        paymentId: "payment-1",
        idempotencyKey: "payment-intent-key",
      }),
    ).resolves.toEqual({
      paymentId: "payment-1",
      orderId: "order-1",
      status: "pending",
      checkoutUrl: null,
      degraded: true,
      reason: "provider_unavailable",
      retryAfterSeconds: 30,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/backend/payments/payment-1/intent",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Idempotency-Key": "payment-intent-key",
        }),
        cache: "no-store",
      }),
    );
  });

  it("returns checkoutUrl for a successful payment intent response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            paymentId: "payment-success",
            orderId: "order-success",
            status: "pending",
            checkoutUrl: "https://pay.example/checkout/payment-success",
            degraded: false,
            reason: null,
            retryAfterSeconds: null,
          },
          { status: 201 },
        ),
      ),
    );

    await expect(
      createPaymentIntent({
        paymentId: "payment-success",
        idempotencyKey: "payment-intent-key",
      }),
    ).resolves.toEqual({
      paymentId: "payment-success",
      orderId: "order-success",
      status: "pending",
      checkoutUrl: "https://pay.example/checkout/payment-success",
      degraded: false,
      reason: null,
      retryAfterSeconds: null,
    });
  });

  it("maps ambiguous payment intent responses into pending reconciliation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          paymentId: "payment-2",
          orderId: "order-2",
          status: "pending_reconciliation",
          checkoutUrl: null,
          degraded: true,
          reason: "provider_timeout_ambiguous",
          retryAfterSeconds: 5,
        }),
      ),
    );

    await expect(
      createPaymentIntent({
        paymentId: "payment-2",
        idempotencyKey: "payment-intent-key",
      }),
    ).resolves.toMatchObject({
      paymentId: "payment-2",
      status: "pending_reconciliation",
      degraded: true,
      reason: "provider_timeout_ambiguous",
      retryAfterSeconds: 5,
    });
  });

  it("derives order display status from the first payment status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          id: "11111111-1111-4111-8111-111111111111",
          status: "pending_payment",
          totalAmount: "2000000",
          reservations: [
            {
              id: "reservation-1",
              ticketTypeId: "ticket-1",
              quantity: 2,
              expiresAt: "2026-07-15T00:10:00.000Z",
            },
          ],
          payments: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              provider: "mock",
              status: "pending_reconciliation",
              providerTxnId: null,
              checkoutUrl: "https://pay.example/checkout/2222",
            },
          ],
          tickets: [],
          paymentId: "22222222-2222-4222-8222-222222222222",
          concertId: "concert-1",
          concertTitle: "Flash Sale Concert",
          venue: "TicketBox Arena, Ho Chi Minh City",
          ticketTypeId: "ticket-1",
          ticketTypeName: "SVIP",
          quantity: 2,
          buyer: {
            fullName: "Tran Thi B",
            phone: "0912",
            email: "tran@example.com",
          },
        }),
      ),
    );

    await expect(
      getOrder("11111111-1111-4111-8111-111111111111"),
    ).resolves.toMatchObject({
      status: "PAYMENT_PENDING_RECONCILIATION",
      reservationExpiresAt: "2026-07-15T00:10:00.000Z",
      concertId: "concert-1",
      concertTitle: "Flash Sale Concert",
      venue: "TicketBox Arena, Ho Chi Minh City",
      ticketTypeId: "ticket-1",
      ticketTypeName: "SVIP",
      quantity: 2,
      buyer: {
        fullName: "Tran Thi B",
        phone: "0912",
        email: "tran@example.com",
      },
      paymentIntent: {
        paymentId: "22222222-2222-4222-8222-222222222222",
        provider: "mock",
        status: "pending_reconciliation",
        providerTxnId: null,
        checkoutUrl: "https://pay.example/checkout/2222",
      },
    });
  });

  it("maps ticket response metadata from backend contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          id: "ticket-1",
          orderId: "order-1",
          concertId: "concert-1",
          concertTitle: "Flash Sale Concert",
          venue: "TicketBox Arena, Ho Chi Minh City",
          startsAt: "2026-12-01T12:00:00.000Z",
          ticketTypeId: "ticket-1",
          ticketTypeName: "SVIP",
          sequenceNo: 7,
          status: "issued",
          owner: {
            fullName: "Tran Thi B",
            phone: "0912",
            email: "tran@example.com",
          },
          qrCode: { value: "opaque-qr-token" },
        }),
      ),
    );

    await expect(getTicket("ticket-1")).resolves.toMatchObject({
      ticketId: "ticket-1",
      orderId: "order-1",
      concertId: "concert-1",
      concertTitle: "Flash Sale Concert",
      venue: "TicketBox Arena, Ho Chi Minh City",
      startsAt: "2026-12-01T12:00:00.000Z",
      ticketTypeId: "ticket-1",
      ticketTypeName: "SVIP",
      seats: ["Vé #7"],
      qrPayload: "opaque-qr-token",
      signedPayload: "opaque-qr-token",
      owner: {
        fullName: "Tran Thi B",
        phone: "0912",
        email: "tran@example.com",
      },
      status: "issued",
    });
  });
});
