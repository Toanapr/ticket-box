import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./backend-bff", () => ({ getBackendBaseUrl: vi.fn(() => "http://backend.test") }));

import { getBackendBaseUrl } from "./backend-bff";
import { getConcertByIdentifier, getConcerts } from "./server-api";

const mockedBaseUrl = vi.mocked(getBackendBaseUrl);
const concertId = "11111111-1111-4111-8111-111111111111";
const concertSlug = "backend-concert";
const ticketTypeId = "22222222-2222-4222-8222-222222222222";

function apiConcert(): Record<string, unknown> {
  return {
    id: concertId,
    slug: concertSlug,
    title: "Backend Concert",
    venue: "TicketBox Arena",
    artistName: "Backend Artist",
    description: "Loaded from PostgreSQL",
    startAt: "2026-09-15T12:00:00.000Z",
    status: "published",
    seatingMapObjectKey: "concerts/backend/map.json",
    publishedArtistBio: "Backend Artist biography",
    ticketTypes: [
      {
        id: ticketTypeId,
        zoneCode: "VIP",
        name: "VIP",
        price: "1000000",
        capacity: 100,
        perUserLimit: 4,
        saleStartAt: "2026-01-01T00:00:00.000Z",
        saleEndAt: "2027-01-01T00:00:00.000Z",
        availableCount: 50,
      },
    ],
  };
}

describe("concert server API", () => {
  beforeEach(() => {
    mockedBaseUrl.mockReturnValue("http://backend.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("loads and normalizes the concert list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([apiConcert()]));
    vi.stubGlobal("fetch", fetchMock);

    const concerts = await getConcerts();

    expect(concerts[0]).toMatchObject({ id: concertId, title: "Backend Concert", artists: ["Backend Artist"] });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/concerts",
      expect.objectContaining({ next: { revalidate: 30 } }),
    );
  });

  it("returns null only when detail is not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(getConcertByIdentifier(concertSlug)).resolves.toBeNull();
  });

  it("normalizes a successful detail response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(apiConcert()));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getConcertByIdentifier(concertSlug)).resolves.toMatchObject({
      id: concertId,
      slug: concertSlug,
      title: "Backend Concert",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `http://backend.test/concerts/${concertSlug}`,
      expect.objectContaining({ next: { revalidate: 15 } }),
    );
  });

  it("preserves rate-limit status and retry metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "30" } })),
    );

    await expect(getConcerts()).rejects.toMatchObject({
      kind: "rate-limit",
      status: 429,
      retryAfter: "30",
    });
  });

  it("rejects upstream and malformed JSON responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(getConcerts()).rejects.toMatchObject({ kind: "upstream", status: 500 });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })));
    await expect(getConcerts()).rejects.toMatchObject({ kind: "contract" });
  });

  it("fails when backend configuration is absent", async () => {
    mockedBaseUrl.mockImplementation(() => {
      throw new Error("BACKEND_API_BASE_URL is not configured");
    });
    vi.stubGlobal("fetch", vi.fn());

    await expect(getConcerts()).rejects.toMatchObject({ kind: "configuration" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("times out a stalled backend request", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
      ),
    );

    const request = getConcerts().catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(request).resolves.toMatchObject({ kind: "timeout" });
  });
});
