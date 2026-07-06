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
  eventType: string;
  notificationType: "TicketIssued" | "ConcertReminder24h" | string;
  concertId?: string | null;
  orderId?: string | null;
  ownerUserId: string;
  ticketCount?: number | null;
  channel: "in_app" | "email";
  status: "pending" | "sent" | "failed";
  idempotencyKey: string;
  message: string;
  error?: string | null;
  scheduledFor: string;
  processedAt?: string | null;
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

export type ActiveGuestListEntry = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  sponsorId: string | null;
  identityKey: string;
  zoneCode: string;
  ticketTypeId: string | null;
  ticketTypeSlug: string | null;
  ticketTypeName: string | null;
};

export type ActiveGuestList = {
  concertId: string;
  version: {
    id: string;
    versionNo: number;
    entryCount: number;
    publishedAt: string;
  } | null;
  entries: ActiveGuestListEntry[];
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

export async function deleteConcert(
  concertId: string,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/admin/concerts/${concertId}`, {
    method: "DELETE",
  });
}

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

export async function listActiveGuestList(
  concertId: string,
): Promise<ActiveGuestList> {
  return apiFetch<ActiveGuestList>(
    `/admin/concerts/${concertId}/guest-list/entries`,
  );
}

export async function deleteActiveGuestList(
  concertId: string,
): Promise<{ concertId: string; deleted: boolean; clearedVersionId?: string }> {
  return apiFetch<{ concertId: string; deleted: boolean; clearedVersionId?: string }>(
    `/admin/concerts/${concertId}/guest-list`,
    { method: "DELETE" },
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
