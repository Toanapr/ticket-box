import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/backend-bff", () => ({
  getBackendBaseUrl: vi.fn(() => "http://backend.test"),
}));

import { GET } from "./route";

const legacyKey = "11111111-1111-4111-8111-111111111111-1.png";
const versionedKey =
  "11111111-1111-4111-8111-111111111111-2-22222222-2222-4222-8222-222222222222.webp";
const request = new Request("http://audience.test/api/media") as NextRequest;

function context(filename: string) {
  return { params: Promise.resolve({ filename }) };
}

describe("concert poster media proxy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it.each([legacyKey, versionedKey])(
    "streams safe key %s and forwards cache validators",
    async (filename) => {
      const fetchMock = vi.mocked(fetch).mockResolvedValue(
        new Response("image-bytes", {
          headers: {
            "content-type": "image/webp",
            "cache-control": "public, max-age=60",
            etag: '"poster-v2"',
            "last-modified": "Thu, 25 Jun 2026 00:00:00 GMT",
          },
        }),
      );

      const response = await GET(request, context(filename));

      expect(response.status).toBe(200);
      expect(response.headers.get("etag")).toBe('"poster-v2"');
      expect(response.headers.get("last-modified")).toBe(
        "Thu, 25 Jun 2026 00:00:00 GMT",
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(fetchMock).toHaveBeenCalledWith(
        `http://backend.test/media/concert-posters/${filename}`,
        expect.objectContaining({
          cache: "force-cache",
          signal: expect.any(AbortSignal),
        }),
      );
    },
  );

  it("rejects unsafe filenames without calling the backend", async () => {
    const response = await GET(request, context("../secret.png"));

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves an upstream 404", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));

    const response = await GET(request, context(legacyKey));

    expect(response.status).toBe(404);
  });

  it("returns 504 when the backend media request times out", async () => {
    vi.mocked(fetch).mockRejectedValue(
      new DOMException("The operation timed out", "TimeoutError"),
    );

    const response = await GET(request, context(legacyKey));

    expect(response.status).toBe(504);
  });
});
