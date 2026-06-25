import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearActiveReservation, getUserAccountSnapshot, upsertActiveReservation, upsertOrderRecord } from "./user-account-data";
import type { ActiveReservationRecord, OrderRecord } from "./types";

describe("user account storage snapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("window", createWindowStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes active reservations in the account snapshot", () => {
    upsertActiveReservation(createReservationRecord());

    expect(getUserAccountSnapshot()).toMatchObject({
      activeReservations: [
        expect.objectContaining({
          reservationId: "reservation-1",
          concertTitle: "Flash Sale Concert",
        }),
      ],
      profile: expect.objectContaining({
        email: "fan@test.local",
      }),
    });
  });

  it("filters expired reservations out of the account snapshot", () => {
    upsertActiveReservation({
      ...createReservationRecord(),
      reservationId: "reservation-expired",
      expiresAt: "2020-07-15T00:00:00.000Z",
    });

    expect(getUserAccountSnapshot().activeReservations).toHaveLength(0);
  });

  it("moves a reservation out of active holds when its order is stored", () => {
    const reservation = createReservationRecord();
    upsertActiveReservation(reservation);
    upsertOrderRecord(createOrderRecord(reservation.reservationId));

    const snapshot = getUserAccountSnapshot();
    expect(snapshot.activeReservations).toHaveLength(0);
    expect(snapshot.orders).toEqual([
      expect.objectContaining({
        orderId: "order-1",
        reservationId: reservation.reservationId,
      }),
    ]);
  });

  it("clears an active reservation explicitly", () => {
    const reservation = createReservationRecord();
    upsertActiveReservation(reservation);

    clearActiveReservation(reservation.reservationId);

    expect(getUserAccountSnapshot().activeReservations).toHaveLength(0);
  });
});

function createReservationRecord(): ActiveReservationRecord {
  return {
    reservationId: "reservation-1",
    concertId: "concert-1",
    concertSlug: "flash-sale-concert",
    concertTitle: "Flash Sale Concert",
    venue: "TicketBox Arena, Ho Chi Minh City",
    ticketTypeId: "ticket-1",
    ticketTypeSlug: "vip",
    ticketTypeName: "VIP",
    quantity: 2,
    buyer: { fullName: "Khán giả TicketBox", phone: "0909", email: "fan@test.local" },
    totalAmount: 510000,
    createdAt: "2026-07-15T00:00:00.000Z",
    expiresAt: "2026-07-15T00:10:00.000Z",
  };
}

function createOrderRecord(reservationId: string): OrderRecord {
  return {
    orderId: "order-1",
    reservationId,
    concertId: "concert-1",
    concertTitle: "Flash Sale Concert",
    venue: "TicketBox Arena, Ho Chi Minh City",
    ticketTypeId: "ticket-1",
    ticketTypeName: "VIP",
    quantity: 2,
    buyer: { fullName: "Khán giả TicketBox", phone: "0909", email: "fan@test.local" },
    status: "PENDING_PAYMENT",
    totalAmount: 510000,
    createdAt: "2026-07-15T00:00:30.000Z",
    paymentIntent: {
      paymentId: "payment-1",
      provider: "VNPAY",
      providerName: "VNPAY",
      memo: "order-1",
      amount: 510000,
    },
  };
}

function createWindowStub(): Window & typeof globalThis {
  const storage = createMemoryStorage();
  const target = new EventTarget();
  return {
    localStorage: storage,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  } as Window & typeof globalThis;
}

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
