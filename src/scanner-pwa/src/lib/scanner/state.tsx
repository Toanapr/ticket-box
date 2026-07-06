"use client";

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScannerApiClient } from "@/lib/scanner/api-client";
import { useNetworkStatus } from "@/lib/scanner/network";
import {
  clearAssignment,
  clearManifest,
  loadConnectionConfig,
  loadAssignment,
  loadCheckedInTicketRefs,
  loadLastSuccessfulSyncAt,
  loadManifest,
  loadQueue,
  loadResults,
  persistConnectionConfig,
  persistAssignment,
  persistCheckedInTicketRef,
  persistLastSuccessfulSyncAt,
  persistManifest,
  persistQueueItem,
  persistResult,
  replaceCheckedInTicketRefs,
  replaceQueue,
  replaceResults,
} from "@/lib/scanner/storage";
import type {
  NetworkStatus,
  ScannerAssignment,
  ScannerConnectionConfig,
  ScannerManifest,
  ScannerQueueItem,
  ScannerResultRecord,
  ScannerStateSnapshot,
  ScannerSyncSummary,
} from "@/lib/scanner/types";
import { getManifestValidationStatus } from "@/lib/scanner/manifest";
import type { ScannerCheckInSyncRequest } from "@/lib/scanner/types";

type ScannerAppContextValue = ScannerStateSnapshot & {
  syncInFlight: boolean;
  lastSyncError: string | null;
  runSyncNow: () => Promise<void>;
  setConnectionConfig: (config: ScannerConnectionConfig) => Promise<void>;
  syncSummary: ScannerSyncSummary;
  setAssignment: (assignment: ScannerAssignment | null) => Promise<void>;
  setManifest: (manifest: ScannerManifest | null) => Promise<void>;
  setQueue: (queue: ScannerQueueItem[]) => Promise<void>;
  addQueueItem: (queueItem: ScannerQueueItem) => Promise<void>;
  setResults: (results: ScannerResultRecord[]) => Promise<void>;
  addResult: (result: ScannerResultRecord) => Promise<void>;
  setCheckedInTicketRefs: (ticketRefs: string[]) => Promise<void>;
  addCheckedInTicketRef: (ticketRef: string) => Promise<void>;
  setLastSuccessfulSyncAt: (timestamp: string) => Promise<void>;
  setError: (message: string | null) => void;
};

const ScannerAppContext = createContext<ScannerAppContextValue | null>(null);

const initialSnapshot: ScannerStateSnapshot = {
  connectionConfig: null,
  assignment: null,
  manifest: null,
  queue: [],
  results: [],
  checkedInTicketRefs: [],
  lastSuccessfulSyncAt: null,
  networkStatus: "online",
  manifestValidationStatus: "missing",
  ready: false,
  error: null,
};

function buildSyncSummary(
  queue: ScannerQueueItem[],
  results: ScannerResultRecord[],
  lastSuccessfulSyncAt: string | null,
): ScannerSyncSummary {
  return {
    lastSuccessfulSyncAt,
    pendingCount: queue.filter((item) => item.status === "pending").length,
    syncingCount: queue.filter((item) => item.status === "syncing").length,
    acceptedCount: results.filter((item) => item.result === "accepted").length,
    conflictCount: results.filter((item) => item.result === "conflict").length,
    rejectedCount: results.filter((item) => item.result === "rejected").length,
  };
}

export function ScannerAppProvider({ children }: { children: ReactNode }) {
  const networkStatus = useNetworkStatus();
  const [snapshot, setSnapshot] = useState<ScannerStateSnapshot>(initialSnapshot);
  const [syncInFlight, setSyncInFlight] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const autoSyncAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [
          connectionConfig,
          assignment,
          manifest,
          queue,
          results,
          checkedInTicketRefs,
          lastSuccessfulSyncAt,
        ] =
          await Promise.all([
            loadConnectionConfig(),
            loadAssignment(),
            loadManifest(),
            loadQueue(),
            loadResults(),
            loadCheckedInTicketRefs(),
            loadLastSuccessfulSyncAt(),
          ]);

        if (cancelled) {
          return;
        }

        setSnapshot({
          connectionConfig: connectionConfig ?? null,
          assignment: assignment ?? null,
          manifest: manifest ?? null,
          queue,
          results,
          checkedInTicketRefs,
          lastSuccessfulSyncAt: lastSuccessfulSyncAt ?? null,
          networkStatus,
          manifestValidationStatus: getManifestValidationStatus(
            manifest ?? null,
            assignment ?? null,
          ),
          ready: true,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSnapshot((current) => ({
          ...current,
          networkStatus,
          ready: true,
          error:
            error instanceof Error
              ? error.message
              : "Failed to hydrate scanner local state.",
        }));
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [networkStatus]);

  useEffect(() => {
    setSnapshot((current) => ({
      ...current,
      networkStatus,
    }));
  }, [networkStatus]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSnapshot((current) => ({
        ...current,
        manifestValidationStatus: getManifestValidationStatus(
          current.manifest,
          current.assignment,
        ),
      }));
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function setConnectionConfig(config: ScannerConnectionConfig) {
    await persistConnectionConfig(config);
    setSnapshot((current) => ({
      ...current,
      connectionConfig: config,
    }));
  }

  async function runSyncNow() {
    if (syncInFlight) {
      return;
    }

    if (snapshot.networkStatus !== "online") {
      return;
    }

    if (!snapshot.connectionConfig || !snapshot.assignment || !snapshot.manifest) {
      return;
    }

    const pendingItems = snapshot.queue.filter((item) => item.status === "pending");

    if (pendingItems.length === 0) {
      return;
    }

    setSyncInFlight(true);
    setLastSyncError(null);

    const queueMarkedSyncing = snapshot.queue.map((item) =>
      item.status === "pending"
        ? {
            ...item,
            status: "syncing" as const,
            syncAttempts: item.syncAttempts + 1,
          }
        : item,
    );

    await replaceQueue(queueMarkedSyncing);
    setSnapshot((current) => ({
      ...current,
      queue: queueMarkedSyncing,
    }));

    try {
      const client = new ScannerApiClient(snapshot.connectionConfig);
      const payload: ScannerCheckInSyncRequest = {
        assignmentId: snapshot.assignment.assignmentId,
        manifestVersion: snapshot.manifest.version,
        events: pendingItems.map((item) => ({
          clientEventId: item.clientEventId,
          ticketRef: item.ticketRef,
          rawToken: item.rawToken,
          scannerUserId: item.scannerUserId,
          deviceId: item.deviceId,
          eventId: item.eventId,
          gateCode: item.gateCode,
          zoneCode: item.zoneCode,
          clientScannedAt: item.clientScannedAt,
        })),
      };

      const response = await client.syncCheckIns(payload);

      const mergedResults = [
        ...snapshot.results.filter(
          (result) =>
            !response.results.some(
              (incomingResult) => incomingResult.clientEventId === result.clientEventId,
            ),
        ),
        ...response.results,
      ];

      await replaceResults(mergedResults);

      const ackMap = new Map(
        response.results.map((result) => [result.clientEventId, result] as const),
      );

      const reconciledQueue: ScannerQueueItem[] = [];

      for (const item of queueMarkedSyncing) {
        const ack = ackMap.get(item.clientEventId);

        if (!ack) {
          reconciledQueue.push({
            ...item,
            status: "pending",
          });
          continue;
        }

        if (ack.result === "accepted") {
          continue;
        }

        reconciledQueue.push({
          ...item,
          status: ack.result,
          lastSyncedAt: ack.serverRecordedAt,
          lastResultReason: ack.reason,
        });
      }

      await replaceQueue(reconciledQueue);
      await persistLastSuccessfulSyncAt(response.processedAt);

      setSnapshot((current) => ({
        ...current,
        queue: reconciledQueue,
        results: mergedResults,
        lastSuccessfulSyncAt: response.processedAt,
      }));
      setError(null);
      setLastSyncError(null);
    } catch (error) {
      const revertedQueue = queueMarkedSyncing.map((item) =>
        item.status === "syncing"
          ? {
              ...item,
              status: "pending" as const,
            }
          : item,
      );

      await replaceQueue(revertedQueue);
      setSnapshot((current) => ({
        ...current,
        queue: revertedQueue,
      }));

      const message =
        error instanceof Error ? error.message : "Failed to sync scanner queue.";
      setError(message);
      setLastSyncError(message);
    } finally {
      setSyncInFlight(false);
    }
  }

  async function setAssignmentValue(assignment: ScannerAssignment | null) {
    if (assignment) {
      await persistAssignment(assignment);
    } else {
      await clearAssignment();
    }

    setSnapshot((current) => ({
      ...current,
      assignment,
      manifestValidationStatus: getManifestValidationStatus(current.manifest, assignment),
    }));
  }

  async function setManifestValue(manifest: ScannerManifest | null) {
    if (manifest) {
      await persistManifest(manifest);
    } else {
      await clearManifest();
    }

    setSnapshot((current) => ({
      ...current,
      manifest,
      manifestValidationStatus: getManifestValidationStatus(manifest, current.assignment),
    }));
  }

  async function setQueue(queue: ScannerQueueItem[]) {
    await replaceQueue(queue);
    setSnapshot((current) => ({
      ...current,
      queue,
    }));
  }

  async function addQueueItem(queueItem: ScannerQueueItem) {
    await persistQueueItem(queueItem);
    setSnapshot((current) => ({
      ...current,
      queue: [...current.queue.filter((item) => item.clientEventId !== queueItem.clientEventId), queueItem],
    }));
  }

  async function setResults(results: ScannerResultRecord[]) {
    await replaceResults(results);
    setSnapshot((current) => ({
      ...current,
      results,
    }));
  }

  async function addResult(result: ScannerResultRecord) {
    await persistResult(result);
    setSnapshot((current) => ({
      ...current,
      results: [...current.results.filter((item) => item.clientEventId !== result.clientEventId), result],
    }));
  }

  async function setCheckedInTicketRefs(ticketRefs: string[]) {
    await replaceCheckedInTicketRefs(ticketRefs);
    setSnapshot((current) => ({
      ...current,
      checkedInTicketRefs: ticketRefs,
    }));
  }

  async function addCheckedInTicketRef(ticketRef: string) {
    await persistCheckedInTicketRef(ticketRef);
    setSnapshot((current) => ({
      ...current,
      checkedInTicketRefs: Array.from(new Set([...current.checkedInTicketRefs, ticketRef])),
    }));
  }

  async function setLastSuccessfulSyncAt(timestamp: string) {
    await persistLastSuccessfulSyncAt(timestamp);
    setSnapshot((current) => ({
      ...current,
      lastSuccessfulSyncAt: timestamp,
    }));
  }

  function setError(message: string | null) {
    setSnapshot((current) => ({
      ...current,
      error: message,
    }));
  }

  const handleAutoSync = useEffectEvent(() => {
    void runSyncNow();
  });

  useEffect(() => {
    if (snapshot.networkStatus !== "online") {
      autoSyncAttemptedRef.current = false;
      return;
    }

    if (syncInFlight) {
      return;
    }

    if (snapshot.queue.every((item) => item.status !== "pending")) {
      autoSyncAttemptedRef.current = false;
      return;
    }

    if (autoSyncAttemptedRef.current) {
      return;
    }

    autoSyncAttemptedRef.current = true;
    handleAutoSync();
  }, [snapshot.networkStatus, snapshot.queue, syncInFlight]);

  const value: ScannerAppContextValue = {
    ...snapshot,
    syncInFlight,
    lastSyncError,
    runSyncNow,
    setConnectionConfig,
    syncSummary: buildSyncSummary(
      snapshot.queue,
      snapshot.results,
      snapshot.lastSuccessfulSyncAt,
    ),
    setAssignment: setAssignmentValue,
    setManifest: setManifestValue,
    setQueue,
    addQueueItem,
    setResults,
    addResult,
    setCheckedInTicketRefs,
    addCheckedInTicketRef,
    setLastSuccessfulSyncAt,
    setError,
  };

  return (
    <ScannerAppContext.Provider value={value}>
      {children}
    </ScannerAppContext.Provider>
  );
}

export function useScannerAppState() {
  const context = useContext(ScannerAppContext);

  if (!context) {
    throw new Error("useScannerAppState must be used within ScannerAppProvider.");
  }

  return context;
}

export function useScannerNetworkStatus(): NetworkStatus {
  return useScannerAppState().networkStatus;
}
