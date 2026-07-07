export type ScannerAssignmentStatus = "active" | "inactive" | "revoked";

export type ScannerCheckInResult = "accepted" | "conflict" | "rejected";

export type ScannerQueueStatus =
  | "pending"
  | "syncing"
  | "accepted"
  | "conflict"
  | "rejected";

export type NetworkStatus = "online" | "offline";

export type ScannerConnectionConfig = {
  accessToken: string;
  deviceId: string;
  baseUrl: string;
};

export type ScannerAssignment = {
  assignmentId: string;
  deviceId: string;
  scannerUserId: string;
  status: ScannerAssignmentStatus;
  eventId: string;
  concertId: string;
  gateCode: string;
  zoneCode: string;
  manifestVersion: number | null;
  manifestGeneratedAt: string | null;
  manifestExpiresAt: string | null;
};

export type ScannerManifestTicket = {
  ticketRef: string;
  rawToken: string;
  ticketId: string;
  ticketTypeId: string;
  status: string;
  eventId: string;
  gateCode: string;
  zoneCode: string;
};

export type ScannerManifestRevokedTicket = {
  ticketRef: string;
  reason: string;
};

export type ScannerManifestGuest = {
  guestRef: string;
  displayName: string;
  eventId: string;
  gateCode: string;
  zoneCode: string;
};

export type ScannerManifest = {
  assignmentId: string;
  eventId: string;
  concertId: string;
  gateCode: string;
  zoneCode: string;
  version: number;
  generatedAt: string;
  expiresAt: string;
  signature: string;
  chunkIndex: number | null;
  chunkSize: number | null;
  totalChunks: number;
  totalTickets: number;
  totalRevokedTickets: number;
  totalGuestEntries: number;
  isChunked: boolean;
  tickets: ScannerManifestTicket[];
  revokedTickets: ScannerManifestRevokedTicket[];
  guestList: ScannerManifestGuest[];
};

export type ScannerCheckInSyncEvent = {
  clientEventId: string;
  ticketRef: string;
  rawToken?: string;
  scannerUserId: string;
  deviceId: string;
  eventId: string;
  gateCode: string;
  zoneCode: string;
  clientScannedAt: string;
};

export type ScannerCheckInSyncRequest = {
  assignmentId: string;
  manifestVersion: number;
  events: ScannerCheckInSyncEvent[];
};

export type ScannerCheckInAck = {
  clientEventId: string;
  result: ScannerCheckInResult;
  reason: string;
  serverRecordedAt: string;
  winningEventId: string | null;
  checkInEventId: string;
  ticketId: string | null;
};

export type ScannerCheckInSyncResponse = {
  assignmentId: string;
  processedAt: string;
  results: ScannerCheckInAck[];
};

export type ScannerQueueItem = {
  clientEventId: string;
  ticketRef: string;
  rawToken?: string;
  scannerUserId: string;
  deviceId: string;
  eventId: string;
  gateCode: string;
  zoneCode: string;
  clientScannedAt: string;
  status: ScannerQueueStatus;
  syncAttempts: number;
  lastSyncedAt: string | null;
  lastResultReason: string | null;
};

export type ScannerResultRecord = {
  clientEventId: string;
  result: ScannerCheckInResult;
  reason: string;
  serverRecordedAt: string;
  winningEventId: string | null;
  checkInEventId: string;
  ticketId: string | null;
};

export type ScannerSyncSummary = {
  lastSuccessfulSyncAt: string | null;
  pendingCount: number;
  syncingCount: number;
  acceptedCount: number;
  conflictCount: number;
  rejectedCount: number;
};

export type ScannerStateSnapshot = {
  connectionConfig: ScannerConnectionConfig | null;
  assignment: ScannerAssignment | null;
  manifest: ScannerManifest | null;
  queue: ScannerQueueItem[];
  results: ScannerResultRecord[];
  checkedInTicketRefs: string[];
  lastSuccessfulSyncAt: string | null;
  networkStatus: NetworkStatus;
  manifestValidationStatus:
    | "missing"
    | "expired"
    | "scope_mismatch"
    | "signature_unverifiable"
    | "ready";
  ready: boolean;
  error: string | null;
};
