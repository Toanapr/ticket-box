import { randomUUID } from "expo-crypto";
import type { ScannerAssignment, ScannerCheckInSyncEvent } from "./types";
import type { ParsedQrPayload } from "./scan";

export function buildPendingQueueEvent(input: {
  assignment: ScannerAssignment;
  payload: ParsedQrPayload;
}): ScannerCheckInSyncEvent {
  return {
    clientEventId: randomUUID(),
    ticketRef: input.payload.ticketRef,
    rawToken: input.payload.rawToken,
    scannerUserId: input.assignment.scannerUserId,
    deviceId: input.assignment.deviceId,
    eventId: input.assignment.eventId,
    gateCode: input.assignment.gateCode,
    zoneCode: input.assignment.zoneCode,
    clientScannedAt: new Date().toISOString(),
  };
}
