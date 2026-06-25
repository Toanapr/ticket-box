import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCheckoutIntent } from "./checkout-intent";

describe("checkout intent", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: createMemoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reuses idempotency keys for the same checkout intent", () => {
    const input = { concertId: "concert-1", ticketTypeId: "ticket-1", quantity: 2, userKey: "user@example.com" };
    const first = getCheckoutIntent(input);
    const retry = getCheckoutIntent(input);

    expect(retry.reservationIdempotencyKey).toBe(first.reservationIdempotencyKey);
    expect(retry.orderIdempotencyKey).toBe(first.orderIdempotencyKey);
  });

  it("creates a new intent when quantity changes", () => {
    const first = getCheckoutIntent({ concertId: "concert-1", ticketTypeId: "ticket-1", quantity: 1, userKey: "user@example.com" });
    const changed = getCheckoutIntent({ concertId: "concert-1", ticketTypeId: "ticket-1", quantity: 2, userKey: "user@example.com" });

    expect(changed.reservationIdempotencyKey).not.toBe(first.reservationIdempotencyKey);
    expect(changed.orderIdempotencyKey).not.toBe(first.orderIdempotencyKey);
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}
