export type ConcertStatus = "draft" | "published" | "canceled";

export type TicketType = {
  id: string;
  concertId: string;
  zoneCode: string;
  name: string;
  price: number | string;
  capacity: number;
  saleStartAt: string;
  saleEndAt: string;
  perUserLimit: number;
  availableCount?: number;
};

export type Concert = {
  id: string;
  title: string;
  venue: string;
  artistName: string;
  description?: string | null;
  startAt: string;
  status: ConcertStatus;
  seatingMapObjectKey: string;
  publishedArtistBio: string;
  ticketTypes: TicketType[];
};

export type NotificationRecord = {
  id: string;
  eventType: "TicketIssued";
  orderId: string;
  ownerUserId: string;
  ticketCount: number;
  channel: "in_app" | "email_mock";
  status: "sent" | "failed";
  message: string;
  error?: string | null;
  createdAt: string;
};

export type ConcertPayload = {
  title: string;
  venue: string;
  artistName: string;
  description?: string | null;
  startAt: string;
  status: ConcertStatus;
  seatingMapObjectKey: string;
  publishedArtistBio: string;
};

export type TicketTypePayload = {
  zoneCode: string;
  name: string;
  price: number | string;
  capacity: number;
  saleStartAt: string;
  saleEndAt: string;
  perUserLimit: number;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  headers.set("Content-Type", "application/json");

  const response = await fetch(`/api/backend${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.message ?? `API request failed with ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}
