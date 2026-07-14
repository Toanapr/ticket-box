export type ScannerSetupQrPayload = {
  type: "ticketbox-scanner-config";
  version: 1;
  apiBaseUrl: string;
  deviceCode: string;
  accessToken: string;
};

export function buildScannerSetupQrPayload(input: {
  apiBaseUrl: string;
  deviceCode: string;
  accessToken: string;
}): string {
  const payload: ScannerSetupQrPayload = {
    type: "ticketbox-scanner-config",
    version: 1,
    apiBaseUrl: normalizeScannerApiBaseUrl(input.apiBaseUrl),
    deviceCode: requireValue(input.deviceCode, "deviceCode"),
    accessToken: requireValue(input.accessToken, "accessToken"),
  };

  return JSON.stringify(payload);
}

function normalizeScannerApiBaseUrl(value: string): string {
  const normalized = requireValue(value, "apiBaseUrl").replace(/\/+$/, "");
  const parsed = new URL(normalized);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("apiBaseUrl must use http or https");
  }

  return normalized.endsWith("/scanner") ? normalized : `${normalized}/scanner`;
}

function requireValue(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}
