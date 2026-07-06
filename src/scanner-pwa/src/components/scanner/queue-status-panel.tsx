"use client";

import { PanelShell } from "@/components/scanner/panel-shell";
import { useScannerAppState } from "@/lib/scanner/state";

export function QueueStatusPanel() {
  const {
    queue,
    syncSummary,
    syncInFlight,
    lastSyncError,
    runSyncNow,
    networkStatus,
  } = useScannerAppState();

  const pendingItems = queue.filter((item) => item.status === "pending");
  const blockedItems = queue.filter(
    (item) => item.status === "conflict" || item.status === "rejected",
  );

  return (
    <PanelShell
      eyebrow="Milestone 5"
      title="Queue Operations, Recovery, and Review"
      description="The queue view now supports event-day operations: staff can see pending and syncing states, understand degraded mode, confirm reload-safe persistence, and review conflict or rejected items that stay local after sync."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <QueueMetric label="Pending" value={String(syncSummary.pendingCount)} />
        <QueueMetric label="Syncing" value={String(syncSummary.syncingCount)} />
        <QueueMetric label="Accepted" value={String(syncSummary.acceptedCount)} />
        <QueueMetric
          label="Conflict + Rejected"
          value={String(syncSummary.conflictCount + syncSummary.rejectedCount)}
        />
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Sync engine
            </p>
            <h3 className="mt-2 text-lg font-semibold">Online recovery control</h3>
          </div>
          <button
            type="button"
            onClick={() => void runSyncNow()}
            disabled={networkStatus !== "online" || syncInFlight || pendingItems.length === 0}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncInFlight ? "Syncing..." : "Sync now"}
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <QueueMetric label="Network" value={networkStatus} />
          <QueueMetric
            label="Last successful sync"
            value={syncSummary.lastSuccessfulSyncAt ?? "Never"}
          />
          <QueueMetric
            label="Auto recovery"
            value={
              networkStatus === "online" && pendingItems.length > 0
                ? "Enabled"
                : "Waiting"
            }
          />
        </div>

        {lastSyncError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {lastSyncError}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-muted">
          Queue, manifest, result history, and checked-in refs are persisted in IndexedDB
          and restored after reload. Accepted items are removed only after their ACK has
          been written locally.
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <p className="text-sm font-semibold">Queue preview</p>
        <div className="mt-4 space-y-3">
          {queue.length === 0 ? (
            <p className="text-sm text-muted">
              Queue is empty. Accepted items have already been cleaned after ACK persistence.
            </p>
          ) : (
            queue
              .slice()
              .reverse()
              .map((item) => (
                <div
                  key={item.clientEventId}
                  className="rounded-2xl border border-line bg-white/65 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{item.ticketRef}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${renderQueueStatusTone(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    {item.clientScannedAt} - attempts {item.syncAttempts}
                  </p>
                  {item.lastResultReason ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                      Last result: {item.lastResultReason}
                    </p>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">Conflict and rejected review</p>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
            {blockedItems.length} item{blockedItems.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {blockedItems.length === 0 ? (
            <p className="text-sm text-muted">
              No conflict or rejected items are waiting for review.
            </p>
          ) : (
            blockedItems
              .slice()
              .reverse()
              .map((item) => (
                <div
                  key={item.clientEventId}
                  className="rounded-2xl border border-line bg-white/65 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{item.ticketRef}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${renderQueueStatusTone(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    Last sync {item.lastSyncedAt ?? "not recorded"} - attempts {item.syncAttempts}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                    Reason: {item.lastResultReason ?? "Backend reason pending"}
                  </p>
                </div>
              ))
          )}
        </div>
      </div>
    </PanelShell>
  );
}

function QueueMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-strong p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold leading-7 break-words">{value}</p>
    </div>
  );
}

function renderQueueStatusTone(status: "pending" | "syncing" | "accepted" | "conflict" | "rejected") {
  switch (status) {
    case "pending":
      return "bg-stone-100 text-stone-700";
    case "syncing":
      return "bg-sky-100 text-sky-800";
    case "accepted":
      return "bg-emerald-100 text-emerald-800";
    case "conflict":
      return "bg-amber-100 text-amber-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-stone-100 text-stone-700";
  }
}
