import { describe, expect, it } from "vitest";
import { formatHoldCountdown, getHoldRemainingMs, shouldShowOrderHoldCountdown } from "./reservation-hold";

describe("reservation hold countdown", () => {
  it("formats the remaining hold duration as mm:ss", () => {
    expect(formatHoldCountdown("2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:08:29.000Z"))).toBe("01:31");
  });

  it("clamps expired reservations to zero", () => {
    expect(getHoldRemainingMs("2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:10:05.000Z"))).toBe(0);
    expect(formatHoldCountdown("2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:10:05.000Z"))).toBe("00:00");
  });

  it("only shows the order-page countdown while payment is still unresolved and hold is active", () => {
    expect(shouldShowOrderHoldCountdown("PENDING_PAYMENT", "2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:09:00.000Z"))).toBe(true);
    expect(shouldShowOrderHoldCountdown("PAYMENT_PENDING_RECONCILIATION", "2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:09:00.000Z"))).toBe(true);
    expect(shouldShowOrderHoldCountdown("PAYMENT_EXPIRED", "2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:09:00.000Z"))).toBe(false);
    expect(shouldShowOrderHoldCountdown("PENDING_PAYMENT", "2026-07-15T00:10:00.000Z", new Date("2026-07-15T00:10:05.000Z"))).toBe(false);
  });
});
