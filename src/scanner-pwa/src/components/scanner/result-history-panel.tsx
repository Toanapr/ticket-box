"use client";

import { PanelShell } from "@/components/scanner/panel-shell";
import { useScannerAppState } from "@/lib/scanner/state";

export function ResultHistoryPanel() {
  const { results, syncSummary } = useScannerAppState();
  const blockedResults = results.filter(
    (result) => result.result === "conflict" || result.result === "rejected",
  );

  return (
    <PanelShell
      eyebrow="Milestone 5"
      title="Persisted ACK History and Review"
      description="ACK outcomes are kept locally so staff can review accepted, conflict, and rejected decisions after reload without depending on transient request state."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <ResultCount label="Accepted" value={String(syncSummary.acceptedCount)} />
        <ResultCount label="Conflict" value={String(syncSummary.conflictCount)} />
        <ResultCount label="Rejected" value={String(syncSummary.rejectedCount)} />
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5 text-sm leading-7 text-muted">
        Result history is persisted in IndexedDB. This keeps conflict and rejected ACKs
        visible after reload, while accepted queue entries can still be cleaned safely.
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <p className="text-sm font-semibold">Persisted ACK history</p>
        <div className="mt-4 space-y-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted">
              No sync acknowledgements yet. Once the queue syncs, each backend ACK is written here before accepted queue items are removed.
            </p>
          ) : (
            results
              .slice()
              .reverse()
              .map((result) => (
                <div
                  key={result.clientEventId}
                  className="rounded-2xl border border-line bg-white/65 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{result.clientEventId}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${renderResultTone(
                        result.result,
                      )}`}
                    >
                      {result.result}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    {result.reason} - {result.serverRecordedAt}
                  </p>
                  {result.winningEventId ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                      Winning event: {result.winningEventId}
                    </p>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface-strong p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold">Review required</p>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
            {blockedResults.length} result{blockedResults.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {blockedResults.length === 0 ? (
            <p className="text-sm text-muted">
              No conflict or rejected acknowledgements require follow-up.
            </p>
          ) : (
            blockedResults
              .slice()
              .reverse()
              .map((result) => (
                <div
                  key={result.clientEventId}
                  className="rounded-2xl border border-line bg-white/65 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{result.clientEventId}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${renderResultTone(
                        result.result,
                      )}`}
                    >
                      {result.result}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    {result.reason} - {result.serverRecordedAt}
                  </p>
                  {result.winningEventId ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">
                      Winning event: {result.winningEventId}
                    </p>
                  ) : null}
                </div>
              ))
          )}
        </div>
      </div>
    </PanelShell>
  );
}

function ResultCount({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-strong p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function renderResultTone(result: "accepted" | "conflict" | "rejected") {
  switch (result) {
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
