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
  const payload = await fetchConcertJson("/concerts", {
    revalidate: 30,
  });
  try {
    return normalizeConcertList(payload);
  } catch {
    throw new ConcertApiError("contract", "Concert list response does not match the expected contract");
  }
}

export async function getConcertByIdentifier(identifier: string): Promise<ConcertDetail | null> {
  const payload = await fetchConcertJson(`/concerts/${encodeURIComponent(identifier)}`, {
    allowNotFound: true,
    cache: "no-store",
  });
  if (payload === null) return null;

  try {
    return normalizeConcertDetail(payload);
  } catch {
    throw new ConcertApiError("contract", "Concert detail response does not match the expected contract");
  }
}

type ConcertFetchOptions =
  | {
      allowNotFound?: boolean;
      revalidate: number;
    }
  | {
      allowNotFound?: boolean;
      cache: "no-store";
    };

async function fetchConcertJson(path: string, options: ConcertFetchOptions): Promise<unknown | null> {
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
      ...buildCacheOptions(options),
    });

    if (options.allowNotFound && response.status === 404) return null;
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

function buildCacheOptions(
  options: ConcertFetchOptions,
): Pick<RequestInit, "cache"> | { next: { revalidate: number } } {
  if ("cache" in options) {
    return { cache: options.cache };
  }

  return { next: { revalidate: options.revalidate } };
}
