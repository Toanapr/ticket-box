import type { ScannerConnectionConfig } from "./types";

export function parseScannerSetupQr(rawValue: string): ScannerConnectionConfig {
  let value: unknown;

  try {
    value = JSON.parse(rawValue);
  } catch {
    throw new Error("Setup QR is not valid JSON.");
  }

  if (!isRecord(value)) {
    throw new Error("Setup QR payload must be an object.");
  }

  if (value.type !== "ticketbox-scanner-config" || value.version !== 1) {
    throw new Error("Unsupported TicketBox setup QR.");
  }

  const baseUrl = requireString(value.apiBaseUrl, "apiBaseUrl").replace(
    /\/+$/,
    "",
  );
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Scanner API URL must use HTTP or HTTPS.");
  }

  return {
    baseUrl: baseUrl.endsWith("/scanner") ? baseUrl : `${baseUrl}/scanner`,
    deviceId: requireString(value.deviceCode, "deviceCode"),
    accessToken: requireString(value.accessToken, "accessToken"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Setup QR is missing ${field}.`);
  }
  return value.trim();
}
