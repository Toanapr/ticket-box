import {
  idbClear,
  idbDelete,
  idbGet,
  idbGetAll,
  idbSet,
} from "@/lib/scanner/indexed-db";
import type {
  ScannerAssignment,
  ScannerConnectionConfig,
  ScannerManifest,
  ScannerQueueItem,
  ScannerResultRecord,
} from "@/lib/scanner/types";

const CONNECTION_KEY = "connection";
const ASSIGNMENT_KEY = "current";
const MANIFEST_KEY = "current";
const LAST_SYNC_KEY = "lastSuccessfulSyncAt";

export async function loadConnectionConfig() {
  return idbGet<ScannerConnectionConfig>("meta", CONNECTION_KEY);
}

export async function persistConnectionConfig(config: ScannerConnectionConfig) {
  await idbSet("meta", config, CONNECTION_KEY);
}

export async function loadAssignment() {
  return idbGet<ScannerAssignment>("assignment", ASSIGNMENT_KEY);
}

export async function persistAssignment(assignment: ScannerAssignment) {
  await idbSet("assignment", assignment, ASSIGNMENT_KEY);
}

export async function clearAssignment() {
  await idbDelete("assignment", ASSIGNMENT_KEY);
}

export async function loadManifest() {
  return idbGet<ScannerManifest>("manifest", MANIFEST_KEY);
}

export async function persistManifest(manifest: ScannerManifest) {
  await idbSet("manifest", manifest, MANIFEST_KEY);
}

export async function clearManifest() {
  await idbDelete("manifest", MANIFEST_KEY);
}

export async function loadQueue() {
  return idbGetAll<ScannerQueueItem>("queue");
}

export async function persistQueueItem(queueItem: ScannerQueueItem) {
  await idbSet("queue", queueItem);
}

export async function removeQueueItem(clientEventId: string) {
  await idbDelete("queue", clientEventId);
}

export async function replaceQueue(queue: ScannerQueueItem[]) {
  await idbClear("queue");
  await Promise.all(queue.map((queueItem) => persistQueueItem(queueItem)));
}

export async function loadResults() {
  return idbGetAll<ScannerResultRecord>("results");
}

export async function persistResult(result: ScannerResultRecord) {
  await idbSet("results", result);
}

export async function replaceResults(results: ScannerResultRecord[]) {
  await idbClear("results");
  await Promise.all(results.map((result) => persistResult(result)));
}

export async function loadCheckedInTicketRefs() {
  const entries = await idbGetAll<{ ticketRef: string }>("checkedIn");
  return entries.map((entry) => entry.ticketRef);
}

export async function persistCheckedInTicketRef(ticketRef: string) {
  await idbSet("checkedIn", { ticketRef });
}

export async function replaceCheckedInTicketRefs(ticketRefs: string[]) {
  await idbClear("checkedIn");
  await Promise.all(ticketRefs.map((ticketRef) => persistCheckedInTicketRef(ticketRef)));
}

export async function loadLastSuccessfulSyncAt() {
  return idbGet<string>("meta", LAST_SYNC_KEY);
}

export async function persistLastSuccessfulSyncAt(value: string) {
  await idbSet("meta", value, LAST_SYNC_KEY);
}
