import { chromium } from "playwright";

const APP_URL = process.env.SCANNER_PWA_URL ?? "http://localhost:3000";
const executablePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  "C:/Users/Admin/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const mockBaseUrl = "https://scanner.test/scanner";
const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const preservedClientEventId = "retry-client-event-001";

const seededState = {
  connectionConfig: {
    accessToken: "scanner-token",
    deviceId: "scanner-device-01",
    baseUrl: mockBaseUrl,
  },
  assignment: {
    assignmentId: "assign-retry-test",
    deviceId: "scanner-device-01",
    scannerUserId: "scanner-user-01",
    status: "active",
    eventId: "event-retry-01",
    concertId: "concert-retry-01",
    gateCode: "GATE-A",
    zoneCode: "ZONE-1",
    manifestVersion: 77,
    manifestGeneratedAt: new Date().toISOString(),
    manifestExpiresAt: futureExpiry,
  },
  manifest: {
    assignmentId: "assign-retry-test",
    eventId: "event-retry-01",
    concertId: "concert-retry-01",
    gateCode: "GATE-A",
    zoneCode: "ZONE-1",
    version: 77,
    generatedAt: new Date().toISOString(),
    expiresAt: futureExpiry,
    signature: "test-signature",
    chunkIndex: null,
    chunkSize: null,
    totalChunks: 1,
    totalTickets: 1,
    totalRevokedTickets: 0,
    totalGuestEntries: 0,
    isChunked: false,
    tickets: [],
    revokedTickets: [],
    guestList: [],
  },
  queue: [
    {
      clientEventId: preservedClientEventId,
      ticketRef: "TICKET-RETRY-001",
      rawToken: "RAW-TOKEN-RETRY-001",
      scannerUserId: "scanner-user-01",
      deviceId: "scanner-device-01",
      eventId: "event-retry-01",
      gateCode: "GATE-A",
      zoneCode: "ZONE-1",
      clientScannedAt: new Date().toISOString(),
      status: "pending",
      syncAttempts: 0,
      lastSyncedAt: null,
      lastResultReason: null,
    },
  ],
  results: [],
  checkedIn: ["TICKET-RETRY-001"],
};

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const capturedPayloads = [];
  let requestCount = 0;

  await page.route(`${mockBaseUrl}/check-in-sync`, async (route) => {
    requestCount += 1;
    capturedPayloads.push(route.request().postDataJSON());

    if (requestCount === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Temporary sync failure for retry test.",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        assignmentId: "assign-retry-test",
        processedAt: new Date().toISOString(),
        results: [
          {
            clientEventId: preservedClientEventId,
            result: "accepted",
            reason: "Accepted on retry.",
            serverRecordedAt: new Date().toISOString(),
            winningEventId: null,
            checkInEventId: "checkin-retry-accepted-001",
            ticketId: "ticket-retry-1",
          },
        ],
      }),
    });
  });

  try {
    console.log("STEP 1: open queue page");
    await page.goto(`${APP_URL}/queue`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Queue Operations, Recovery, and Review");

    console.log("STEP 2: seed retry state");
    await seedIndexedDb(page, seededState);
    await page.reload({ waitUntil: "domcontentloaded" });

    console.log("STEP 3: wait for first sync failure");
    await page.waitForSelector("text=Temporary sync failure for retry test.");

    const afterFailure = await inspectLocalState(page);

    console.log("STEP 4: manual retry sync");
    await page.getByRole("button", { name: "Sync now" }).click();
    await page.waitForFunction(() => document.body.innerText.includes("Queue is empty."));

    console.log("STEP 5: inspect accepted result history");
    await page.goto(`${APP_URL}/results`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Accepted on retry.");

    const afterRetry = await inspectLocalState(page);

    console.log(
      JSON.stringify(
        {
          ok: true,
          requestCount,
          firstPayloadClientEventId: capturedPayloads[0]?.events?.[0]?.clientEventId ?? null,
          secondPayloadClientEventId: capturedPayloads[1]?.events?.[0]?.clientEventId ?? null,
          afterFailure,
          afterRetry,
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

async function inspectLocalState(page) {
  return page.evaluate(async () => {
    function openDb() {
      return new Promise((resolve, reject) => {
        const request = window.indexedDB.open("ticketbox-scanner", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("Failed to open IndexedDB."));
      });
    }

    const db = await openDb();

    function getAll(storeName) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error(`Failed to read ${storeName}.`));
      });
    }

    const queue = await getAll("queue");
    const results = await getAll("results");
    db.close();

    return {
      queueStatuses: queue.map((item) => item.status),
      queueAttempts: queue.map((item) => item.syncAttempts),
      queueClientEventIds: queue.map((item) => item.clientEventId),
      resultKinds: results.map((item) => item.result),
      resultClientEventIds: results.map((item) => item.clientEventId),
    };
  });
}

async function seedIndexedDb(page, state) {
  await page.evaluate(async (payload) => {
    function openDb() {
      return new Promise((resolve, reject) => {
        const request = window.indexedDB.open("ticketbox-scanner", 1);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains("assignment")) {
            database.createObjectStore("assignment");
          }
          if (!database.objectStoreNames.contains("manifest")) {
            database.createObjectStore("manifest");
          }
          if (!database.objectStoreNames.contains("queue")) {
            database.createObjectStore("queue", { keyPath: "clientEventId" });
          }
          if (!database.objectStoreNames.contains("results")) {
            database.createObjectStore("results", { keyPath: "clientEventId" });
          }
          if (!database.objectStoreNames.contains("checkedIn")) {
            database.createObjectStore("checkedIn", { keyPath: "ticketRef" });
          }
          if (!database.objectStoreNames.contains("meta")) {
            database.createObjectStore("meta");
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("Failed to open IndexedDB."));
      });
    }

    function withStore(db, storeName, mode, operation) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = operation(store);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(request.error ?? new Error("Failed to write IndexedDB record."));
        tx.onerror = () =>
          reject(tx.error ?? new Error(`Transaction failed for ${storeName}.`));
      });
    }

    function put(db, storeName, value, key) {
      return withStore(db, storeName, "readwrite", (store) =>
        key === undefined ? store.put(value) : store.put(value, key),
      );
    }

    async function clear(db, storeName) {
      await withStore(db, storeName, "readwrite", (store) => store.clear());
    }

    const db = await openDb();
    await clear(db, "assignment");
    await clear(db, "manifest");
    await clear(db, "queue");
    await clear(db, "results");
    await clear(db, "checkedIn");
    await clear(db, "meta");

    await put(db, "meta", payload.connectionConfig, "connection");
    await put(db, "assignment", payload.assignment, "current");
    await put(db, "manifest", payload.manifest, "current");

    for (const queueItem of payload.queue) {
      await put(db, "queue", queueItem);
    }

    for (const result of payload.results) {
      await put(db, "results", result);
    }

    for (const ticketRef of payload.checkedIn) {
      await put(db, "checkedIn", { ticketRef });
    }

    db.close();
  }, state);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
