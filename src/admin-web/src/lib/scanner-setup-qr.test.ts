import assert from "node:assert/strict";
import test from "node:test";
import { buildScannerSetupQrPayload } from "./scanner-setup-qr.ts";

test("builds a versioned scanner setup payload with deviceCode", () => {
  const encoded = buildScannerSetupQrPayload({
    apiBaseUrl: "http://192.168.2.7:3000/",
    deviceCode: "DEV-TEST-001",
    accessToken: "scanner:user-id",
  });

  assert.deepEqual(JSON.parse(encoded), {
    type: "ticketbox-scanner-config",
    version: 1,
    apiBaseUrl: "http://192.168.2.7:3000/scanner",
    deviceCode: "DEV-TEST-001",
    accessToken: "scanner:user-id",
  });
});

test("rejects an empty access token", () => {
  assert.throws(() =>
    buildScannerSetupQrPayload({
      apiBaseUrl: "http://localhost:3000",
      deviceCode: "DEV-TEST-001",
      accessToken: "",
    }),
  );
});
