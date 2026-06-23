import "server-only";

import { normalizeConcertDetail, normalizeConcertList } from "./concert-api-adapter";
import { getBackendBaseUrl } from "./backend-bff";
import type { ConcertDetail, ConcertSummary } from "./types";

const requestTimeoutMs = 8_000;

export type ConcertApiErrorKind = "configuration" | "rate-limit" | "timeout" | "upstream" | "contract";

export class ConcertApiError extends Error {
  constructor(
    readonly kind: ConcertApiErrorKind,
    message: string,
    readonly status?: number,
    readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "ConcertApiError";
  }
}

export async function getConcerts(): Promise<ConcertSummary[]> {
  const payload = await fetchConcertJson("/concerts", 30);
  try {
    return normalizeConcertList(payload);
  } catch {
    throw new ConcertApiError("contract", "Concert list response does not match the expected contract");
  }
}

export async function getConcertById(id: string): Promise<ConcertDetail | null> {
  const payload = await fetchConcertJson(`/concerts/${encodeURIComponent(id)}`, 15, true);
  if (payload === null) return null;

  try {
    return normalizeConcertDetail(payload);
  } catch {
    throw new ConcertApiError("contract", "Concert detail response does not match the expected contract");
  }
}

async function fetchConcertJson(path: string, revalidate: number, allowNotFound = false): Promise<unknown | null> {
  let baseUrl: string;
  try {
    baseUrl = getBackendBaseUrl();
  } catch {
    throw new ConcertApiError("configuration", "Concert API is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      signal: controller.signal,
      next: { revalidate },
    });

    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after") ?? undefined;
      const kind: ConcertApiErrorKind = response.status === 429 ? "rate-limit" : "upstream";
      throw new ConcertApiError(kind, `Concert API request failed with status ${response.status}`, response.status, retryAfter);
    }

    try {
      return await response.json();
    } catch {
      throw new ConcertApiError("contract", "Concert API returned invalid JSON", response.status);
    }
  } catch (error) {
    if (error instanceof ConcertApiError) throw error;
    if (controller.signal.aborted) throw new ConcertApiError("timeout", "Concert API request timed out");
    throw new ConcertApiError("upstream", "Concert API is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
