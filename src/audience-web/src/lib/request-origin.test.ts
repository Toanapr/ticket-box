import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request-origin";

describe("isSameOriginRequest", () => {
  it("accepts an external host when Next uses an internal container URL", () => {
    const request = new Request("http://localhost:3000/api/backend/orders", {
      method: "POST",
      headers: {
        host: "192.168.2.7:3001",
        origin: "http://192.168.2.7:3001",
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("uses forwarded host and protocol behind a reverse proxy", () => {
    const request = new Request("http://audience-web:3000/api/backend/orders", {
      method: "POST",
      headers: {
        host: "audience-web:3000",
        origin: "https://tickets.example.com",
        "x-forwarded-host": "tickets.example.com",
        "x-forwarded-proto": "https",
      },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects a different browser origin", () => {
    const request = new Request("http://localhost:3000/api/backend/orders", {
      method: "POST",
      headers: {
        host: "192.168.2.7:3001",
        origin: "http://malicious.example",
      },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("allows non-browser requests without an Origin header", () => {
    const request = new Request("http://localhost:3000/api/backend/orders", {
      method: "POST",
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects malformed origins", () => {
    const request = new Request("http://localhost:3000/api/backend/orders", {
      method: "POST",
      headers: { origin: "null" },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });
});
