import { describe, expect, it } from "vitest";
import { normalizeConcertDetail, normalizeConcertList } from "./concert-api-adapter";
import { ConcertContractError } from "./concert-api-contract";

const concertId = "11111111-1111-4111-8111-111111111111";
const ticketTypeId = "22222222-2222-4222-8222-222222222222";

function concertFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: concertId,
    title: "Aurora Live",
    venue: "TicketBox Arena, Ho Chi Minh City",
    artistName: "The Aurora Lights",
    description: null,
    startAt: "2026-09-15T12:00:00.000Z",
    status: "published",
    seatingMapObjectKey: "concerts/aurora/seating-map.json",
    publishedArtistBio: "Artist biography",
    ticketTypes: [ticketTypeFixture()],
    ...overrides,
  };
}

function ticketTypeFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ticketTypeId,
    zoneCode: "SVIP",
    name: "SVIP",
    price: "2500000.00",
    capacity: 100,
    perUserLimit: 4,
    saleStartAt: "2026-07-01T00:00:00.000Z",
    saleEndAt: "2026-09-01T00:00:00.000Z",
    availableCount: 80,
    inventory: { totalCapacity: 100, reservedCount: 10, soldCount: 10 },
    cachedAt: "2026-07-15T00:00:00.000Z",
    staleAt: "2026-07-15T00:00:05.000Z",
    ...overrides,
  };
}

describe("concert API adapter", () => {
  it("normalizes the Prisma-shaped backend response", () => {
    const concert = normalizeConcertDetail(concertFixture(), new Date("2026-07-15T00:00:00.000Z"));

    expect(concert).toEqual({
      id: concertId,
      title: "Aurora Live",
      artists: ["The Aurora Lights"],
      venue: "TicketBox Arena, Ho Chi Minh City",
      startsAt: "2026-09-15T12:00:00.000Z",
      status: "selling",
      description: "Artist biography",
      seatingMapVersion: "concerts/aurora/seating-map.json",
      ticketTypes: [
        {
          id: ticketTypeId,
          zone: "svip",
          name: "SVIP",
          price: 2500000,
          maxPerUser: 4,
          availableApprox: 80,
          capacity: 100,
          saleStartsAt: "2026-07-01T00:00:00.000Z",
          saleEndsAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });
    expect(concert.posterPath).toBeUndefined();
  });

  it.each([
    ["upcoming before sale", "2026-06-01T00:00:00.000Z", ticketTypeFixture(), "upcoming"],
    ["sold out during sale", "2026-07-15T00:00:00.000Z", ticketTypeFixture({ availableCount: 0 }), "soldout"],
    ["sold out after sale", "2026-09-02T00:00:00.000Z", ticketTypeFixture(), "soldout"],
  ])("derives %s status", (_label, now, ticketType, expected) => {
    const concert = normalizeConcertDetail(concertFixture({ ticketTypes: [ticketType] }), new Date(now));
    expect(concert.status).toBe(expected);
  });

  it("treats a concert without ticket types as upcoming", () => {
    const concert = normalizeConcertDetail(concertFixture({ ticketTypes: [] }));
    expect(concert.status).toBe("upcoming");
  });

  it("normalizes an empty list without injecting mocks", () => {
    expect(normalizeConcertList([])).toEqual([]);
  });

  it.each([
    ["invalid date", { startAt: "not-a-date" }],
    ["negative price", { ticketTypes: [ticketTypeFixture({ price: -1 })] }],
    ["unknown zone", { ticketTypes: [ticketTypeFixture({ zoneCode: "BALCONY" })] }],
    ["missing ticket array", { ticketTypes: undefined }],
  ])("rejects %s", (_label, overrides) => {
    expect(() => normalizeConcertDetail(concertFixture(overrides))).toThrow(ConcertContractError);
  });
});
