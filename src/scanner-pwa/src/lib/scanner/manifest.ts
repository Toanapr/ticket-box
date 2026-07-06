import type {
  ScannerAssignment,
  ScannerManifest,
  ScannerManifestGuest,
  ScannerManifestRevokedTicket,
  ScannerManifestTicket,
} from "@/lib/scanner/types";

export function getManifestValidationStatus(
  manifest: ScannerManifest | null,
  assignment: ScannerAssignment | null,
): "missing" | "expired" | "scope_mismatch" | "signature_unverifiable" | "ready" {
  if (!manifest) {
    return "missing";
  }

  if (Date.parse(manifest.expiresAt) <= Date.now()) {
    return "expired";
  }

  if (
    assignment &&
    (manifest.assignmentId !== assignment.assignmentId ||
      manifest.eventId !== assignment.eventId ||
      manifest.gateCode !== assignment.gateCode ||
      manifest.zoneCode !== assignment.zoneCode)
  ) {
    return "scope_mismatch";
  }

  // Current backend contract uses HMAC, so the browser cannot independently
  // verify authenticity without a separate verification key flow.
  if (!manifest.signature || manifest.signature.trim().length === 0) {
    return "signature_unverifiable";
  }

  return "ready";
}

export function buildMergedManifest(chunks: ScannerManifest[]): ScannerManifest {
  if (chunks.length === 0) {
    throw new Error("Cannot merge an empty manifest chunk list.");
  }

  const orderedChunks = [...chunks].sort((left, right) => {
    const leftIndex = left.chunkIndex ?? 0;
    const rightIndex = right.chunkIndex ?? 0;
    return leftIndex - rightIndex;
  });

  const firstChunk = orderedChunks[0];

  return {
    ...firstChunk,
    chunkIndex: null,
    chunkSize: firstChunk.chunkSize,
    isChunked: firstChunk.totalChunks > 1,
    tickets: flattenBy(orderedChunks, (chunk) => chunk.tickets, "ticketRef"),
    revokedTickets: flattenBy(
      orderedChunks,
      (chunk) => chunk.revokedTickets,
      "ticketRef",
    ),
    guestList: flattenBy(orderedChunks, (chunk) => chunk.guestList, "guestRef"),
  };
}

function flattenBy<T extends ScannerManifestTicket | ScannerManifestRevokedTicket | ScannerManifestGuest>(
  chunks: ScannerManifest[],
  selector: (chunk: ScannerManifest) => T[],
  key: keyof T,
) {
  const map = new Map<string, T>();

  for (const chunk of chunks) {
    for (const item of selector(chunk)) {
      map.set(String(item[key]), item);
    }
  }

  return Array.from(map.values());
}
