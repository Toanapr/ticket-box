export type ConcertStatus = "draft" | "published";

export type TicketType = {
  id: string;
  concertId: string;
  zoneCode: string;
  price: number;
  capacity: number;
  saleStartsAt: string;
  saleEndsAt: string;
  perUserLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type Concert = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  status: ConcertStatus;
  ticketTypes: TicketType[];
  createdAt: string;
  updatedAt: string;
};

export type NotificationRecord = {
  id: string;
  eventType: "TicketIssued";
  ticketId: string;
  orderId: string;
  concertId: string;
  channel: "in_app" | "email_mock";
  status: "sent" | "failed";
  message: string;
  error?: string;
  createdAt: string;
};

export type ConcertPayload = {
  title: string;
  venue: string;
  startsAt: string;
  status: ConcertStatus;
};

export type TicketTypePayload = {
  zoneCode: string;
  price: number;
  capacity: number;
  saleStartsAt: string;
  saleEndsAt: string;
  perUserLimit: number;
};

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const adminHeaders = {
  "x-user-role": process.env.NEXT_PUBLIC_ADMIN_ROLE ?? "organizer",
  "x-organization-id": process.env.NEXT_PUBLIC_ORGANIZATION_ID ?? "org-demo",
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isAdminPath = path.startsWith("/admin");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(isAdminPath ? adminHeaders : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
