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
  posterObjectKey?: string | null;
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


export type GuestListImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  delimiter?: string;
  schemaVersion: string;
  errorReason?: string;
};

export type GuestListImportBatch = {
  id: string;
  concertId: string;
  fileChecksum: string;
  schemaVersion: string;
  rawObjectKey: string;
  originalName?: string | null;
  status: "imported" | "validation_failed" | "published" | "failed";
  summary: GuestListImportSummary;
  createdAt: string;
  updatedAt: string;
  idempotent?: boolean;
  version?: {
    id: string;
    versionNo: number;
    isActive: boolean;
    entryCount: number;
    publishedAt: string;
  } | null;
};

export type GuestListImportErrors = {
  batchId: string;
  status: GuestListImportBatch["status"];
  summary: GuestListImportSummary;
  errors: Array<{
    rowNumber: number;
    errorReason: string;
    rawRow: Record<string, unknown>;
  }>;
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


export async function uploadGuestListCsv(
  concertId: string,
  file: File,
): Promise<GuestListImportBatch> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<GuestListImportBatch>(
    `/admin/concerts/${concertId}/guest-list/import`,
    { method: "POST", body: formData },
  );
}

export async function listGuestListImports(
  concertId: string,
): Promise<GuestListImportBatch[]> {
  return apiFetch<GuestListImportBatch[]>(
    `/admin/concerts/${concertId}/guest-list/imports`,
  );
}

export async function uploadPoster(
  concertId: string,
  file: File,
): Promise<{ posterObjectKey: string }> {
  const formData = new FormData();
  formData.append("poster", file);

  return apiFetch<{ posterObjectKey: string }>(
    `/admin/concerts/${concertId}/poster`,
    { method: "PUT", body: formData },
  );
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);

  if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

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
