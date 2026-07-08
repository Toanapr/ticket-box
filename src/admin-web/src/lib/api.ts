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

export type ArtistProfile = {
  name: string;
  role?: string;
  summary: string;
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
  publishedArtistProfiles?: ArtistProfile[];
  posterObjectKey?: string | null;
  ticketTypes: TicketType[];
};

export type ArtistBioJobStatus =
  | "queued"
  | "processing"
  | "draft_ready"
  | "failed";

export type ArtistBioDraft = {
  id: string;
  concertId: string;
  jobId: string;
  content: string;
  artistProfiles: ArtistProfile[];
  reviewStatus: "pending_review" | string;
  providerVersion: string;
  modelVersion: string;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type ArtistBioJob = {
  id: string;
  concertId: string;
  fileChecksum: string;
  pipelineVersion: string;
  rawObjectKey: string;
  originalName?: string | null;
  sourceMimeType?: string | null;
  status: ArtistBioJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  extractedText?: string | null;
  sanitizedText?: string | null;
  providerVersion?: string | null;
  modelVersion?: string | null;
  promptVersion?: string | null;
  createdAt: string;
  updatedAt: string;
  idempotent?: boolean;
  draft?: ArtistBioDraft | null;
};

export type ArtistBioReviewState = {
  concertId: string;
  artistName: string;
  publishedArtistBio: string;
  publishedArtistProfiles: ArtistProfile[];
  latestDraft: ArtistBioDraft | null;
  jobs: ArtistBioJob[];
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

export async function uploadArtistBioPdf(
  concertId: string,
  file: File,
): Promise<ArtistBioJob> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<ArtistBioJob>(`/admin/concerts/${concertId}/artist-bio/jobs`, {
    method: "POST",
    body: formData,
  });
}

export async function listArtistBioJobs(
  concertId: string,
): Promise<ArtistBioJob[]> {
  return apiFetch<ArtistBioJob[]>(`/admin/concerts/${concertId}/artist-bio/jobs`);
}

export async function getArtistBioReviewState(
  concertId: string,
): Promise<ArtistBioReviewState> {
  return apiFetch<ArtistBioReviewState>(
    `/admin/concerts/${concertId}/artist-bio/review`,
  );
}

export async function retryArtistBioJob(jobId: string): Promise<ArtistBioJob> {
  return apiFetch<ArtistBioJob>(`/admin/artist-bio/jobs/${jobId}/retry`, {
    method: "POST",
  });
}

export async function updateArtistBioDraft(
  draftId: string,
  content: string,
): Promise<ArtistBioDraft> {
  return apiFetch<ArtistBioDraft>(`/admin/artist-bio/drafts/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function publishArtistBioDraft(
  draftId: string,
): Promise<{
  concertId: string;
  draftId: string;
  jobId: string;
  publishedArtistBio: string;
  publishedArtistProfiles: ArtistProfile[];
}> {
  return apiFetch(`/admin/artist-bio/drafts/${draftId}/publish`, {
    method: "POST",
  });
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

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId?: string | null;
};

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me");
}
