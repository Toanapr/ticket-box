"use client";

import { useTransition } from "react";
import { PanelShell } from "@/components/scanner/panel-shell";
import { ScannerConnectionForm } from "@/components/scanner/scanner-connection-form";
import { ScannerApiClient } from "@/lib/scanner/api-client";
import { useScannerAppState } from "@/lib/scanner/state";

export function AssignmentStatusPanel() {
  const {
    assignment,
    connectionConfig,
    ready,
    setAssignment,
    setError,
  } = useScannerAppState();
  const [isPending, startTransition] = useTransition();

  function handleFetchAssignment() {
    if (!connectionConfig) {
      setError("Save scanner connection settings before loading assignment.");
      return;
    }

    startTransition(async () => {
      try {
        const client = new ScannerApiClient(connectionConfig);
        const response = await client.getAssignment();
        await setAssignment(response);
        setError(null);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load scanner assignment.",
        );
      }
    });
  }

  return (
    <PanelShell
      eyebrow="Milestone 2"
      title="Assignment Fetch and Persist"
      description="This screen now loads the live scanner assignment from the backend contract, persists it locally, and exposes the active event, gate, zone, and manifest metadata needed by the rest of the offline flow."
    >
      <ScannerConnectionForm />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFetchAssignment}
          disabled={!ready || isPending}
          className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Loading assignment..." : "Load assignment"}
        </button>
        <p className="text-sm text-muted">
          Assignment is persisted in IndexedDB after a successful fetch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          label="Hydration"
          value={ready ? "Local state ready" : "Loading local state"}
        />
        <InfoCard
          label="Assignment status"
          value={assignment?.status ?? "No assignment loaded"}
        />
        <InfoCard label="Assignment id" value={assignment?.assignmentId ?? "Pending"} />
        <InfoCard label="Device" value={assignment?.deviceId ?? "Pending backend"} />
        <InfoCard
          label="Scanner user"
          value={assignment?.scannerUserId ?? "Pending backend"}
        />
        <InfoCard label="Event" value={assignment?.eventId ?? "Pending backend"} />
        <InfoCard
          label="Gate / Zone"
          value={
            assignment
              ? `${assignment.gateCode} / ${assignment.zoneCode}`
              : "Pending backend"
          }
        />
        <InfoCard
          label="Manifest metadata"
          value={
            assignment?.manifestVersion !== null && assignment?.manifestVersion !== undefined
              ? `v${assignment.manifestVersion} · expires ${assignment.manifestExpiresAt ?? "n/a"}`
              : "Manifest metadata unavailable"
          }
        />
      </div>
    </PanelShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-strong p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold leading-7 break-words">{value}</p>
    </div>
  );
}
