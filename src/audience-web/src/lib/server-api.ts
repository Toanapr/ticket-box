import { findConcert, mockConcerts } from "./mock-data";
import type { ConcertDetail, ConcertSummary } from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("No API base URL configured");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getConcerts(): Promise<ConcertSummary[]> {
  if (apiBaseUrl) {
    // TODO(Person 1 contract): normalize backend field names when GET /concerts is finalized.
    return fetchJson<ConcertSummary[]>("/concerts", {
      next: { revalidate: 30 },
    });
  }

  return mockConcerts.map((concert) => ({
    id: concert.id,
    title: concert.title,
    artists: concert.artists,
    venue: concert.venue,
    startsAt: concert.startsAt,
    status: concert.status,
    description: concert.description,
    posterPath: concert.posterPath,
  }));
}

export async function getConcertById(id: string): Promise<ConcertDetail | null> {
  if (apiBaseUrl) {
    // TODO(Person 1 contract): include inventory summary TTL metadata when GET /concerts/:id is finalized.
    return fetchJson<ConcertDetail>(`/concerts/${id}`, {
      next: { revalidate: 15 },
    });
  }

  return findConcert(id) ?? null;
}
