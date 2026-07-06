"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useScannerAppState } from "@/lib/scanner/state";

const navigationItems = [
  { href: "/assignment", label: "Assignment" },
  { href: "/manifest", label: "Manifest" },
  { href: "/scanner", label: "Scanner" },
  { href: "/queue", label: "Queue" },
  { href: "/results", label: "Results" },
];

export function ScannerAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const scannerState = useScannerAppState();
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const pendingCount = scannerState.queue.filter((item) => item.status === "pending").length;
  const blockedReviewCount = scannerState.queue.filter(
    (item) => item.status === "conflict" || item.status === "rejected",
  ).length;
  const manifestTime = scannerState.manifest?.expiresAt
    ? Date.parse(scannerState.manifest.expiresAt)
    : null;
  const manifestExpiresSoon =
    manifestTime !== null &&
    manifestTime > currentTime &&
    manifestTime - currentTime <= 15 * 60 * 1000;
  const offlineBannerTone =
    scannerState.networkStatus === "offline" ||
    scannerState.manifestValidationStatus === "expired" ||
    scannerState.manifestValidationStatus === "missing" ||
    scannerState.manifestValidationStatus === "scope_mismatch";
  const degradedModeReason = (() => {
    if (scannerState.networkStatus === "offline") {
      return "Network is offline. Scanner remains in degraded mode and records eligible scans locally for later sync.";
    }

    if (scannerState.manifestValidationStatus === "expired") {
      return "Manifest has expired. Offline scan intake should pause until a fresh manifest is loaded.";
    }

    if (scannerState.manifestValidationStatus === "missing") {
      return "Manifest is missing. Load assignment and manifest before relying on offline check-in.";
    }

    if (scannerState.manifestValidationStatus === "scope_mismatch") {
      return "Manifest scope no longer matches the active assignment. Refresh assignment and manifest before scanning.";
    }

    if (manifestExpiresSoon) {
      return "Manifest is close to expiry. Refresh it soon to avoid blocking offline check-in mid-shift.";
    }

    if (pendingCount > 0) {
      return `${pendingCount} local event${pendingCount === 1 ? "" : "s"} waiting for sync. Queue is durable across reloads via IndexedDB.`;
    }

    return "Scanner is ready. Local manifest, queue, results, and checked-in set are hydrated from IndexedDB on reload.";
  })();

  return (
    <div className="min-h-screen px-4 py-5 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-line bg-surface p-5 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
                TicketBox
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Scanner Console
              </h1>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                scannerState.networkStatus === "online"
                  ? "bg-accent-soft text-accent"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {scannerState.networkStatus}
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface-strong p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Active Scope
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="text-muted">Device:</span>{" "}
                {scannerState.assignment?.deviceId ?? "Not assigned"}
              </p>
              <p>
                <span className="text-muted">Event:</span>{" "}
                {scannerState.assignment?.eventId ?? "Pending"}
              </p>
              <p>
                <span className="text-muted">Gate/Zone:</span>{" "}
                {scannerState.assignment
                  ? `${scannerState.assignment.gateCode} / ${scannerState.assignment.zoneCode}`
                  : "Pending"}
              </p>
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-2">
            {navigationItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-accent text-white shadow-lg shadow-emerald-950/15"
                      : "text-foreground hover:bg-accent-soft"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
            Foundation for Issue 2 is ready for assignment, manifest, offline scan,
            queue, and sync workflows.
          </div>
        </aside>

        <div className="flex min-h-full flex-col gap-5">
          <header className="rounded-[28px] border border-line bg-surface px-5 py-4 shadow-[var(--shadow)] backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                  Offline Operations
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Durable queue and sync-safe scanner shell
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatusTile
                  label="Pending"
                  value={String(pendingCount)}
                />
                <StatusTile
                  label="Review"
                  value={String(blockedReviewCount)}
                />
                <StatusTile
                  label="Manifest"
                  value={
                    scannerState.manifest
                      ? `v${scannerState.manifest.version}`
                      : "Missing"
                  }
                />
              </div>
            </div>
          </header>

          <div
            className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${
              offlineBannerTone
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            <p className="font-semibold">
              {offlineBannerTone ? "Degraded mode guidance" : "Operations status"}
            </p>
            <p className="mt-1">{degradedModeReason}</p>
          </div>

          {scannerState.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {scannerState.error}
            </div>
          ) : null}

          <main className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[28px] border border-line bg-surface p-5 shadow-[var(--shadow)] backdrop-blur">
              {children}
            </section>
            <aside className="rounded-[28px] border border-line bg-surface p-5 shadow-[var(--shadow)] backdrop-blur">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                Local State
              </h3>
              <dl className="mt-4 space-y-4 text-sm">
                <StateRow
                  label="Ready"
                  value={scannerState.ready ? "hydrated" : "booting"}
                />
                <StateRow
                  label="Manifest TTL"
                  value={scannerState.manifest?.expiresAt ?? "Not loaded"}
                />
                <StateRow
                  label="Queue Entries"
                  value={String(scannerState.queue.length)}
                />
                <StateRow
                  label="Checked-in Set"
                  value={String(scannerState.checkedInTicketRefs.length)}
                />
                <StateRow
                  label="Last Sync"
                  value={scannerState.lastSuccessfulSyncAt ?? "Never"}
                />
                <StateRow
                  label="Reload Safety"
                  value="Manifest, queue, results persisted in IndexedDB"
                />
              </dl>
            </aside>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-strong px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[14rem] text-right font-medium break-words">{value}</dd>
    </div>
  );
}
