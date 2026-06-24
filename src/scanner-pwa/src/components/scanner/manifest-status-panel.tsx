"use client";

import { useEffect, useState, useTransition } from "react";
import { PanelShell } from "@/components/scanner/panel-shell";
import { ScannerApiClient, ScannerApiError } from "@/lib/scanner/api-client";
import { buildMergedManifest } from "@/lib/scanner/manifest";
import { useScannerAppState } from "@/lib/scanner/state";

type ChunkingPayload = {
  recommendedChunkSize?: number;
};

export function ManifestStatusPanel() {
  const {
    assignment,
    connectionConfig,
    manifest,
    manifestValidationStatus,
    setManifest,
    setError,
  } = useScannerAppState();
  const [isPending, startTransition] = useTransition();
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const expiresInLabel = (() => {
    if (!manifest?.expiresAt) {
      return "No manifest loaded";
    }

    const diffMs = Date.parse(manifest.expiresAt) - currentTime;
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 0) {
      return `Expired ${Math.abs(diffMinutes)} min ago`;
    }

    return `${diffMinutes} min remaining`;
  })();
  const expiryWarning = (() => {
    if (!manifest?.expiresAt) {
      return {
        tone: "warning" as const,
        title: "Manifest missing",
        message:
          "Offline scanning should remain blocked until a manifest is fetched and persisted locally.",
      };
    }

    const diffMs = Date.parse(manifest.expiresAt) - currentTime;
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 0) {
      return {
        tone: "warning" as const,
        title: "Manifest expired",
        message:
          "This manifest is already past TTL. Refresh it before continuing offline check-in.",
      };
    }

    if (diffMinutes <= 15) {
      return {
        tone: "warning" as const,
        title: "Manifest expiring soon",
        message: `Only ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} remain before offline scanning should pause.`,
      };
    }

    return {
      tone: "ready" as const,
      title: "Manifest persistence healthy",
      message:
        "The current manifest is stored in IndexedDB and will be rehydrated after app reload.",
    };
  })();

  function handleFetchManifest() {
    if (!connectionConfig) {
      setError("Save scanner connection settings before loading manifest.");
      return;
    }

    if (!assignment) {
      setError("Load scanner assignment before requesting manifest.");
      return;
    }

    startTransition(async () => {
      try {
        const client = new ScannerApiClient(connectionConfig);
        const response = await fetchManifestWithChunkFallback(
          client,
          assignment.assignmentId,
        );
        await setManifest(response);
        setError(null);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load scanner manifest.",
        );
      }
    });
  }

  return (
    <PanelShell
      eyebrow="Milestone 2"
      title="Manifest Fetch, Persist, and TTL Guard"
      description="The PWA now downloads the signed manifest, persists it locally, handles oversized manifests by chunking, and computes whether offline scanning should be blocked because the manifest is missing, expired, or mismatched with the active assignment."
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFetchManifest}
          disabled={!connectionConfig || !assignment || isPending}
          className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Loading manifest..." : "Load manifest"}
        </button>
        <p className="text-sm text-muted">
          Full manifest is persisted in IndexedDB after chunk merge when needed.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard label="Version" value={manifest ? `v${manifest.version}` : "Not loaded"} />
        <MetricCard
          label="Expires"
          value={manifest?.expiresAt ?? "No manifest in IndexedDB"}
        />
        <MetricCard label="TTL status" value={expiresInLabel} />
        <MetricCard
          label="Validation status"
          value={renderManifestValidationStatus(manifestValidationStatus)}
        />
        <MetricCard
          label="Chunk mode"
          value={
            manifest
              ? manifest.isChunked
                ? `Merged from ${manifest.totalChunks} chunks`
                : "Full manifest"
              : "Awaiting manifest"
          }
        />
        <MetricCard
          label="Payload counts"
          value={
            manifest
              ? `${manifest.totalTickets} tickets / ${manifest.totalRevokedTickets} revoked / ${manifest.totalGuestEntries} guests`
              : "Awaiting manifest"
          }
        />
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <p className="text-sm font-semibold">Offline scan gate</p>
        <p className="mt-3 text-sm leading-7 text-muted">
          {manifestValidationStatus === "ready"
            ? "Offline scan may proceed from a TTL and scope perspective. Cryptographic signature verification is still limited by the current HMAC-only backend contract."
            : "Offline scan should stay blocked until the manifest becomes valid for this device assignment."}
        </p>
      </div>

      <div
        className={`rounded-3xl border px-5 py-4 text-sm leading-7 ${
          expiryWarning.tone === "ready"
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <p className="font-semibold">{expiryWarning.title}</p>
        <p className="mt-1">{expiryWarning.message}</p>
      </div>
    </PanelShell>
  );
}

async function fetchManifestWithChunkFallback(
  client: ScannerApiClient,
  assignmentId: string,
) {
  try {
    return await client.getManifest({ assignmentId });
  } catch (error) {
    if (
      error instanceof ScannerApiError &&
      error.status === 413 &&
      error.data &&
      typeof error.data === "object"
    ) {
      const payload = error.data as ChunkingPayload;
      const chunkSize = payload.recommendedChunkSize ?? 250;
      const firstChunk = await client.getManifest({
        assignmentId,
        chunkIndex: 0,
        chunkSize,
      });

      if (!firstChunk.isChunked || firstChunk.totalChunks <= 1) {
        return firstChunk;
      }

      const remainingChunks = await Promise.all(
        Array.from({ length: firstChunk.totalChunks - 1 }, (_, index) =>
          client.getManifest({
            assignmentId,
            chunkIndex: index + 1,
            chunkSize,
          }),
        ),
      );

      return buildMergedManifest([firstChunk, ...remainingChunks]);
    }

    throw error;
  }
}

function renderManifestValidationStatus(
  status: "missing" | "expired" | "scope_mismatch" | "signature_unverifiable" | "ready",
) {
  switch (status) {
    case "missing":
      return "Missing manifest";
    case "expired":
      return "Expired";
    case "scope_mismatch":
      return "Assignment scope mismatch";
    case "signature_unverifiable":
      return "Signature present but not independently verifiable";
    case "ready":
      return "Ready for offline validation";
    default:
      return status;
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-strong p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold leading-7 break-words">{value}</p>
    </div>
  );
}
