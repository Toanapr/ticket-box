import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSaleAccessToken, setSaleAccessToken } from "./sale-access-token-storage";

describe("sale access token storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { sessionStorage: createMemoryStorage() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a valid token from session storage", () => {
    setSaleAccessToken("concert-1", {
      token: "token-1",
      expiresAt: "2026-07-15T00:05:00.000Z",
      issuedAt: "2026-07-15T00:00:00.000Z",
    });

    expect(getSaleAccessToken("concert-1", new Date("2026-07-15T00:01:00.000Z"))).toMatchObject({ token: "token-1" });
  });

  it("clears expired tokens and does not return them", () => {
    setSaleAccessToken("concert-1", { token: "token-1", expiresAt: "2026-07-15T00:00:00.000Z" });

    expect(getSaleAccessToken("concert-1", new Date("2026-07-15T00:01:00.000Z"))).toBeNull();
    expect(window.sessionStorage.getItem("ticketbox:sale-access:concert-1")).toBeNull();
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
