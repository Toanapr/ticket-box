import type {
  ScannerAssignment,
  ScannerCheckInSyncRequest,
  ScannerCheckInSyncResponse,
  ScannerManifest,
} from "@/lib/scanner/types";

type ScannerApiClientOptions = {
  accessToken: string;
  deviceId: string;
  correlationId?: string;
  baseUrl?: string;
};

type ManifestQuery = {
  assignmentId?: string;
  chunkIndex?: number;
  chunkSize?: number;
};

export class ScannerApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ScannerApiError";
    this.status = status;
    this.data = data;
  }
}

export class ScannerApiClient {
  private readonly accessToken: string;
  private readonly deviceId: string;
  private readonly correlationId?: string;
  private readonly baseUrl: string;

  constructor(options: ScannerApiClientOptions) {
    this.accessToken = options.accessToken;
    this.deviceId = options.deviceId;
    this.correlationId = options.correlationId;
    this.baseUrl =
      options.baseUrl ??
      process.env.EXPO_PUBLIC_SCANNER_API_BASE_URL?.trim() ??
      "http://localhost:3000/scanner";
  }

  getAssignment() {
    return this.request<ScannerAssignment>("/assignment");
  }

  getManifest(query: ManifestQuery = {}) {
    const searchParams = new URLSearchParams();

    if (query.assignmentId) {
      searchParams.set("assignmentId", query.assignmentId);
    }

    if (query.chunkIndex !== undefined) {
      searchParams.set("chunkIndex", String(query.chunkIndex));
    }

    if (query.chunkSize !== undefined) {
      searchParams.set("chunkSize", String(query.chunkSize));
    }

    const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
    return this.request<ScannerManifest>(`/manifest${suffix}`);
  }

  syncCheckIns(payload: ScannerCheckInSyncRequest) {
    return this.request<ScannerCheckInSyncResponse>("/check-in-sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.accessToken}`,
        "x-device-id": this.deviceId,
        "Cache-Control": "no-cache",
        ...(this.correlationId
          ? {
              "x-correlation-id": this.correlationId,
            }
          : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      let message = `Scanner API request failed with status ${response.status}`;
      let errorData: unknown = null;

      try {
        const errorBody = (await response.json()) as { message?: string };
        errorData = errorBody;
        if (errorBody.message) {
          message = errorBody.message;
        }
      } catch {}

      throw new ScannerApiError(message, response.status, errorData);
    }

    return response.json() as Promise<T>;
  }
}
