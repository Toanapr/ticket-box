import { describe, expect, it } from "vitest";
import { resolveTicketTypeSelection } from "./ticket-type-selection";
import type { ConcertDetail, TicketType } from "./types";

const ticketTypes: TicketType[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "vip",
    zone: "vip",
    name: "VIP",
    price: 1_800_000,
    maxPerUser: 4,
    availableApprox: 10,
    capacity: 100,
    saleStartsAt: "2026-01-01T00:00:00.000Z",
    saleEndsAt: "2027-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    slug: "general-admission",
    zone: "ga",
    name: "General Admission",
    price: 500_000,
    maxPerUser: 6,
    availableApprox: 20,
    capacity: 200,
    saleStartsAt: "2026-01-01T00:00:00.000Z",
    saleEndsAt: "2027-01-01T00:00:00.000Z",
  },
];

const concert = { ticketTypes } as ConcertDetail;

describe("resolveTicketTypeSelection", () => {
  it("resolves a public slug without canonicalization", () => {
    expect(resolveTicketTypeSelection(concert, "vip")).toMatchObject({
      ticketType: { id: ticketTypes[0].id },
      canonicalIdentifier: "vip",
    });
  });

  it("resolves a legacy UUID to its canonical slug", () => {
    expect(resolveTicketTypeSelection(concert, ticketTypes[1].id)).toMatchObject({
      ticketType: { id: ticketTypes[1].id },
      canonicalIdentifier: "general-admission",
    });
  });

  it("keeps an unknown identifier while safely selecting a fallback", () => {
    expect(resolveTicketTypeSelection(concert, "unknown-zone")).toMatchObject({
      ticketType: { id: ticketTypes[0].id },
      canonicalIdentifier: "unknown-zone",
    });
  });
});
