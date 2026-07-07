import { apiFetch, Concert } from "./api";

export type ScannerAssignment = {
  id: string;
  deviceId: string;
  scannerUserId: string;
  eventId: string;
  concertId: string;
  gateCode: string;
  zoneCode: string;
  status: "active" | "inactive" | "revoked";
  createdAt: string;
};

export type ScannerDevice = {
  id: string;
  deviceCode: string;
  status: "active" | "inactive" | "revoked";
  scannerUserId: string;
  lastSeenAt: string | null;
  createdAt: string;
  activeAssignment: ScannerAssignment | null;
};

export async function listScanners(): Promise<{ devices: ScannerDevice[] }> {
  return apiFetch<{ devices: ScannerDevice[] }>("/admin/scanners");
}

export async function provisionScanner(deviceCode?: string): Promise<{
  deviceId: string;
  deviceCode: string;
  accessToken: string;
  status: string;
}> {
  return apiFetch("/admin/scanners", {
    method: "POST",
    body: JSON.stringify({ deviceCode }),
  });
}

export async function assignScanner(
  deviceId: string,
  payload: { concertId: string; gateCode: string; zoneCode: string }
): Promise<ScannerAssignment> {
  return apiFetch(`/admin/scanners/${deviceId}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeScanner(deviceId: string): Promise<void> {
  return apiFetch(`/admin/scanners/${deviceId}/revoke`, {
    method: "POST",
  });
}

export async function listConcertsForAssign(): Promise<Concert[]> {
  return apiFetch<Concert[]>("/admin/concerts");
}
