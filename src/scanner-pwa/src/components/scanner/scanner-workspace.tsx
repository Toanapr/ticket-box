"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PanelShell } from "@/components/scanner/panel-shell";
import { getBarcodeDetector } from "@/lib/scanner/barcode-detector";
import {
  buildPendingQueueEvent,
  validateLocalScan,
  type LocalScanValidationResult,
} from "@/lib/scanner/scan";
import { useScannerAppState } from "@/lib/scanner/state";

type ScanFeedback =
  | {
      tone: "success";
      title: string;
      message: string;
    }
  | {
      tone: "warning";
      title: string;
      message: string;
    }
  | null;

export function ScannerWorkspace() {
  const {
    assignment,
    networkStatus,
    manifest,
    checkedInTicketRefs,
    queue,
    manifestValidationStatus,
    addQueueItem,
    addCheckedInTicketRef,
    setError,
  } = useScannerAppState();
  const [manualValue, setManualValue] = useState("");
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);
  const [cameraState, setCameraState] = useState<
    "idle" | "unsupported" | "ready" | "active" | "blocked"
  >(resolveInitialCameraState);
  const [isPending, startTransition] = useTransition();
  const [lastDetectedValue, setLastDetectedValue] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (scanLoopRef.current !== null) {
        window.clearInterval(scanLoopRef.current);
        scanLoopRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    if (manifestValidationStatus !== "ready") {
      setScanFeedback({
        tone: "warning",
        title: "Offline scan blocked",
        message:
          "Load a valid manifest for the current assignment before camera scanning.",
      });
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraState("unsupported");
      return;
    }

    const detector = getBarcodeDetector();
    if (!detector) {
      setCameraState("unsupported");
      setScanFeedback({
        tone: "warning",
        title: "Barcode detector unavailable",
        message:
          "This browser does not expose BarcodeDetector. Use manual QR input fallback for the demo.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("active");
      startDetectorLoop(detector);
      setError(null);
      setScanFeedback(null);
    } catch (error) {
      setCameraState("blocked");
      setScanFeedback({
        tone: "warning",
        title: "Camera access denied",
        message:
          error instanceof Error
            ? error.message
            : "Camera permission was blocked. Use manual QR input fallback.",
      });
    }
  }

  function stopCamera() {
    if (scanLoopRef.current !== null) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (cameraState === "active") {
      setCameraState("ready");
    }
  }

  function startDetectorLoop(detector: ReturnType<typeof getBarcodeDetector>) {
    if (!detector || !videoRef.current) {
      return;
    }

    if (scanLoopRef.current !== null) {
      window.clearInterval(scanLoopRef.current);
    }

    scanLoopRef.current = window.setInterval(async () => {
      const videoElement = videoRef.current;

      if (!videoElement || videoElement.readyState < 2) {
        return;
      }

      try {
        const codes = await detector.detect(videoElement);
        const rawValue = codes[0]?.rawValue?.trim();

        if (!rawValue || rawValue === lastDetectedValue) {
          return;
        }

        setLastDetectedValue(rawValue);
        handleScanValue(rawValue);
      } catch {
        // Keep silent during polling so demo UX is not flooded by transient detector errors.
      }
    }, 1000);
  }

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (manualValue.trim().length === 0) {
      setScanFeedback({
        tone: "warning",
        title: "Missing QR payload",
        message: "Paste or type the QR string before recording a local scan.",
      });
      return;
    }

    handleScanValue(manualValue);
  }

  function handleScanValue(rawValue: string) {
    startTransition(async () => {
      const validation = validateLocalScan({
        rawValue,
        manifest,
        assignment,
        checkedInTicketRefs,
      });

      if (!validation.ok) {
        setScanFeedback(mapValidationFailure(validation));
        setError(validation.message);
        return;
      }

      try {
        const pendingEvent = buildPendingQueueEvent({
          assignment: assignment!,
          payload: validation.payload,
        });

        await addQueueItem({
          ...pendingEvent,
          status: "pending",
          syncAttempts: 0,
          lastSyncedAt: null,
          lastResultReason: null,
        });
        await addCheckedInTicketRef(validation.ticket.ticketRef);

        setManualValue("");
        setError(null);
        setScanFeedback({
          tone: "success",
          title: "Recorded locally, pending sync",
          message: `Ticket ${validation.ticket.ticketRef} is queued for backend sync.`,
        });
      } catch (error) {
        setScanFeedback({
          tone: "warning",
          title: "Failed to persist local scan",
          message:
            error instanceof Error
              ? error.message
              : "The local queue could not be updated.",
        });
        setError(
          error instanceof Error ? error.message : "Failed to append event to local queue.",
        );
      }
    });
  }

  const pendingCount = queue.filter((item) => item.status === "pending").length;

  return (
    <PanelShell
      eyebrow="Milestone 3"
      title="Offline Scan Core"
      description="The scanner workspace now supports camera-based QR detection when the browser allows it, manual QR fallback for demo environments, local duplicate guard on the same device, and durable queue persistence with generated client event ids."
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-line bg-[linear-gradient(135deg,rgba(11,107,87,0.08),rgba(255,255,255,0.72))] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-accent">
              Camera Scanner
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startCamera}
                disabled={
                  isPending ||
                  cameraState === "active" ||
                  manifestValidationStatus !== "ready"
                }
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start camera
              </button>
              <button
                type="button"
                onClick={stopCamera}
                disabled={cameraState !== "active"}
                className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Stop
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[28px] border border-line bg-black/90">
            <video
              ref={videoRef}
              muted
              playsInline
              className="min-h-72 w-full object-cover"
            />
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            Status: {renderCameraStatus(cameraState)}. Browser camera flow uses
            `getUserMedia` plus `BarcodeDetector`, and falls back to manual QR input
            when unavailable.
          </p>
        </div>

        <div className="space-y-4">
          <ScannerFact
            label="Network mode"
            value={networkStatus}
            hint="Offline scanning is allowed only when manifest prerequisites are satisfied."
          />
          <ScannerFact
            label="Manifest gate"
            value={renderManifestGateLabel(manifestValidationStatus)}
            hint="Manifest TTL, assignment scope, revoked list, and local duplicate guard are enforced."
          />
          <ScannerFact
            label="Local duplicate guard"
            value={`${checkedInTicketRefs.length} local ticket refs tracked`}
            hint="Once a scan is recorded locally, the same device blocks the ticket from being accepted again."
          />
          <ScannerFact
            label="Pending queue"
            value={`${pendingCount} local events waiting for sync`}
            hint="Each local scan generates a fresh clientEventId before being appended to IndexedDB."
          />
        </div>
      </div>

      {manifestValidationStatus !== "ready" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
          <p className="font-semibold">Offline scan blocked</p>
          <p className="mt-1">
            {renderManifestBlockReason(manifestValidationStatus)}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={handleManualSubmit}
        className="rounded-3xl border border-line bg-surface-strong p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Manual fallback
            </p>
            <h3 className="mt-2 text-lg font-semibold">Paste QR payload</h3>
          </div>
          <button
            type="submit"
            disabled={isPending || manifestValidationStatus !== "ready"}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Recording..." : "Record local scan"}
          </button>
        </div>

        <textarea
          value={manualValue}
          onChange={(event) => setManualValue(event.target.value)}
          placeholder='Paste raw QR string or JSON like {"ticketRef":"...","rawToken":"..."}'
          className="mt-4 min-h-32 w-full rounded-3xl border border-line bg-white/90 px-4 py-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-accent"
        />
      </form>

      {scanFeedback ? (
        <div
          className={`rounded-3xl border px-5 py-4 text-sm leading-7 ${
            scanFeedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-semibold">{scanFeedback.title}</p>
          <p className="mt-1">{scanFeedback.message}</p>
        </div>
      ) : null}

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <p className="text-sm font-semibold">Queue preview</p>
        <div className="mt-4 space-y-3">
          {queue.length === 0 ? (
            <p className="text-sm text-muted">
              No local scans yet. Record a scan to create a durable pending event.
            </p>
          ) : (
            queue
              .slice()
              .reverse()
              .slice(0, 5)
              .map((item) => (
                <div
                  key={item.clientEventId}
                  className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm"
                >
                  <p className="font-medium">{item.ticketRef}</p>
                  <p className="mt-1 text-muted">
                    {item.status} - {item.clientScannedAt}
                  </p>
                </div>
              ))
          )}
        </div>
      </div>
    </PanelShell>
  );
}

function renderManifestGateLabel(
  status: "missing" | "expired" | "scope_mismatch" | "signature_unverifiable" | "ready",
) {
  switch (status) {
    case "missing":
      return "Manifest missing";
    case "expired":
      return "Manifest expired";
    case "scope_mismatch":
      return "Assignment mismatch";
    case "signature_unverifiable":
      return "Signature limited by HMAC contract";
    case "ready":
      return "Ready for offline scanning";
    default:
      return status;
  }
}

function renderManifestBlockReason(
  status: "missing" | "expired" | "scope_mismatch" | "signature_unverifiable" | "ready",
) {
  switch (status) {
    case "missing":
      return "Load assignment and manifest before recording offline scans.";
    case "expired":
      return "Manifest TTL has expired. Refresh the manifest before scanning again.";
    case "scope_mismatch":
      return "Manifest scope no longer matches the active assignment. Refresh assignment and manifest.";
    case "signature_unverifiable":
      return "Manifest signature metadata is incomplete for offline scanning.";
    case "ready":
      return "Offline scanning is available.";
    default:
      return status;
  }
}

function renderCameraStatus(status: "idle" | "unsupported" | "ready" | "active" | "blocked") {
  switch (status) {
    case "idle":
      return "Preparing browser capabilities";
    case "unsupported":
      return "Barcode detector unsupported, use manual fallback";
    case "ready":
      return "Camera can be started";
    case "active":
      return "Camera live, scanning for QR codes";
    case "blocked":
      return "Camera permission blocked";
    default:
      return status;
  }
}

function resolveInitialCameraState():
  | "idle"
  | "unsupported"
  | "ready"
  | "active"
  | "blocked" {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    return "unsupported";
  }

  return "ready";
}

function mapValidationFailure(result: Extract<LocalScanValidationResult, { ok: false }>): ScanFeedback {
  return {
    tone: "warning",
    title: "Local scan rejected",
    message: result.message,
  };
}

function ScannerFact({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface-strong p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{hint}</p>
    </div>
  );
}
