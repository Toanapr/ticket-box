import assert from "node:assert/strict";
import test from "node:test";
import { parseScannerSetupQr } from "./setup-qr.ts";

test("parses a TicketBox scanner setup QR", () => {
  assert.deepEqual(
    parseScannerSetupQr(
      JSON.stringify({
        type: "ticketbox-scanner-config",
        version: 1,
        apiBaseUrl: "http://192.168.2.7:3000/scanner",
        deviceCode: "DEV-TEST-001",
        accessToken: "scanner:user-id",
      }),
    ),
    {
      baseUrl: "http://192.168.2.7:3000/scanner",
      deviceId: "DEV-TEST-001",
      accessToken: "scanner:user-id",
    },
  );
});

test("rejects a QR with the wrong type", () => {
  assert.throws(() =>
    parseScannerSetupQr(
      JSON.stringify({ type: "ticket", version: 1, apiBaseUrl: "http://x" }),
    ),
  );
});
