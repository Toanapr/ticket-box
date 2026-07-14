import assert from "node:assert/strict";
import test from "node:test";
import { validateLocalScan } from "./scan.ts";
import type { ScannerAssignment, ScannerManifest } from "./types.ts";

const assignment: ScannerAssignment = {
  assignmentId: "assignment-1",
  deviceId: "DEV-TEST-001",
  scannerUserId: "scanner-user-1",
  status: "active",
  eventId: "event-1",
  concertId: "concert-1",
  gateCode: "GATE_MAIN",
  zoneCode: "VIP",
  manifestVersion: 1,
  manifestGeneratedAt: "2026-07-14T10:00:00.000Z",
  manifestExpiresAt: "2026-07-15T10:00:00.000Z",
};

const manifest: ScannerManifest = {
  assignmentId: assignment.assignmentId,
  eventId: assignment.eventId,
  concertId: assignment.concertId,
  gateCode: assignment.gateCode,
  zoneCode: assignment.zoneCode,
  version: 1,
  generatedAt: "2026-07-14T10:00:00.000Z",
  expiresAt: "2026-07-15T10:00:00.000Z",
  signature: "signature",
  chunkIndex: null,
  chunkSize: null,
  totalChunks: 1,
  totalTickets: 1,
  totalRevokedTickets: 0,
  totalGuestEntries: 0,
  isChunked: false,
  tickets: [
    {
      ticketRef: "CHI-DEP-VIP-001",
      rawToken: "qr-chi-dep-vip-1",
      ticketId: "ticket-1",
      ticketTypeId: "vip",
      status: "issued",
      eventId: assignment.eventId,
      gateCode: assignment.gateCode,
      zoneCode: assignment.zoneCode,
    },
  ],
  revokedTickets: [],
  guestList: [],
};

test("accepts a raw QR token and returns the canonical manifest reference", () => {
  const result = validateLocalScan({
    rawValue: "qr-chi-dep-vip-1",
    manifest,
    assignment,
    checkedInTicketRefs: [],
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.payload.ticketRef, "CHI-DEP-VIP-001");
});

test("rejects a repeated raw token using the canonical local reference", () => {
  const result = validateLocalScan({
    rawValue: "qr-chi-dep-vip-1",
    manifest,
    assignment,
    checkedInTicketRefs: ["CHI-DEP-VIP-001"],
  });

  assert.deepEqual(result, {
    ok: false,
    reason: "duplicate_local_scan",
    message: "This ticket has already been recorded on this device.",
  });
});
