import { afterEach, describe, expect, it, vi } from "vitest";
import { createReservation, getOrder, normalizeErrorCode, parseRetryAfter, ReservationApiError } from "./client-api";

describe("client API transient errors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses Retry-After seconds into an absolute retry timestamp", () => {
    expect(parseRetryAfter("30", new Date("2026-07-15T00:00:00.000Z"))).toEqual({
      retryAfterMs: 30_000,
      retryAt: "2026-07-15T00:00:30.000Z",
    });
  });

  it("parses Retry-After HTTP dates and clamps past dates", () => {
    expect(parseRetryAfter("Wed, 15 Jul 2026 00:01:00 GMT", new Date("2026-07-15T00:00:00.000Z"))).toEqual({
      retryAfterMs: 60_000,
      retryAt: "2026-07-15T00:01:00.000Z",
    });
    expect(parseRetryAfter("Wed, 15 Jul 2026 00:00:00 GMT", new Date("2026-07-15T00:01:00.000Z"))).toEqual({
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
      vi.fn().mockResolvedValue(
        Response.json(
          { code: "RATE_LIMITED", message: "Too many reservation attempts" },
          { status: 429, headers: { "retry-after": "45", "x-correlation-id": "corr-1" } },
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
    ).rejects.toMatchObject<Partial<ReservationApiError>>({
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
        headers: expect.objectContaining({ "x-sale-access-token": "sale-token" }),
      }),
    );
  });

  it("derives order display status from the first payment status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          id: "11111111-1111-4111-8111-111111111111",
          status: "pending_payment",
          totalAmount: "2000000",
          reservations: [{ id: "reservation-1", ticketTypeId: "ticket-1", quantity: 2 }],
          payments: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              provider: "mock",
              status: "pending_reconciliation",
              providerTxnId: null,
            },
          ],
          tickets: [],
        }),
      ),
    );

    await expect(getOrder("11111111-1111-4111-8111-111111111111")).resolves.toMatchObject({
      status: "PAYMENT_PENDING_RECONCILIATION",
      paymentIntent: {
        paymentId: "22222222-2222-4222-8222-222222222222",
        provider: "mock",
        status: "pending_reconciliation",
        providerTxnId: null,
      },
    });
  });
});
