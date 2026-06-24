import { chromium } from "playwright";

const APP_URL = process.env.SCANNER_PWA_URL ?? "http://127.0.0.1:3000";
const executablePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  "C:/Users/Admin/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

const seededState = {
  assignment: {
    assignmentId: "assign-reload-test",
    deviceId: "scanner-device-01",
    scannerUserId: "scanner-user-01",
    status: "active",
    eventId: "event-reload-01",
    concertId: "concert-reload-01",
    gateCode: "GATE-A",
    zoneCode: "ZONE-1",
    manifestVersion: 42,
    manifestGeneratedAt: new Date().toISOString(),
    manifestExpiresAt: futureExpiry,
  },
  manifest: {
    assignmentId: "assign-reload-test",
    eventId: "event-reload-01",
    concertId: "concert-reload-01",
    gateCode: "GATE-A",
    zoneCode: "ZONE-1",
    version: 42,
    generatedAt: new Date().toISOString(),
    expiresAt: futureExpiry,
    signature: "test-signature",
    chunkIndex: null,
    chunkSize: null,
    totalChunks: 1,
    totalTickets: 2,
    totalRevokedTickets: 0,
    totalGuestEntries: 0,
    isChunked: false,
    tickets: [
      {
        ticketRef: "TICKET-OK-001",
        rawToken: "RAW-TOKEN-001",
        ticketId: "ticket-1",
        ticketTypeId: "general",
        status: "valid",
        eventId: "event-reload-01",
        gateCode: "GATE-A",
        zoneCode: "ZONE-1",
      },
      {
        ticketRef: "TICKET-CONFLICT-002",
        rawToken: "RAW-TOKEN-002",
        ticketId: "ticket-2",
        ticketTypeId: "vip",
        status: "valid",
        eventId: "event-reload-01",
        gateCode: "GATE-A",
        zoneCode: "ZONE-1",
      },
    ],
    revokedTickets: [],
    guestList: [],
  },
  queue: [
    {
      clientEventId: "event-pending-001",
      ticketRef: "TICKET-OK-001",
      rawToken: "RAW-TOKEN-001",
      scannerUserId: "scanner-user-01",
      deviceId: "scanner-device-01",
      eventId: "event-reload-01",
      gateCode: "GATE-A",
      zoneCode: "ZONE-1",
      clientScannedAt: new Date().toISOString(),
      status: "pending",
      syncAttempts: 0,
      lastSyncedAt: null,
      lastResultReason: null,
    },
    {
      clientEventId: "event-conflict-002",
      ticketRef: "TICKET-CONFLICT-002",
      rawToken: "RAW-TOKEN-002",
      scannerUserId: "scanner-user-01",
      deviceId: "scanner-device-01",
      eventId: "event-reload-01",
      gateCode: "GATE-A",
      zoneCode: "ZONE-1",
      clientScannedAt: new Date().toISOString(),
      status: "conflict",
      syncAttempts: 2,
      lastSyncedAt: new Date().toISOString(),
      lastResultReason: "Ticket already checked in on another device.",
    },
  ],
  results: [
    {
      clientEventId: "event-conflict-002",
      result: "conflict",
      reason: "Ticket already checked in on another device.",
      serverRecordedAt: new Date().toISOString(),
      winningEventId: "winning-event-xyz",
      checkInEventId: "checkin-event-xyz",
      ticketId: "ticket-2",
    },
  ],
  checkedIn: ["TICKET-OK-001", "TICKET-CONFLICT-002"],
  lastSuccessfulSyncAt: new Date().toISOString(),
};

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("STEP 1: open assignment page");
    await page.goto(`${APP_URL}/assignment`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Scanner Console");

    console.log("STEP 2: seed IndexedDB");
    await seedIndexedDb(page);

    console.log("STEP 3: reload manifest page");
    await page.goto(`${APP_URL}/manifest`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Manifest Fetch, Persist, and TTL Guard", {
      timeout: 15000,
    });
    await page.waitForSelector("text=v42", { timeout: 15000 });

    console.log("STEP 4: reload queue page");
    await page.goto(`${APP_URL}/queue`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Queue Operations, Recovery, and Review");
    await page.waitForSelector("text=TICKET-CONFLICT-002");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=TICKET-CONFLICT-002");
    await page.waitForSelector("text=Ticket already checked in on another device.");

    console.log("STEP 5: reload results page");
    await page.goto(`${APP_URL}/results`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Persisted ACK History and Review");
    await page.waitForSelector("text=winning-event-xyz");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=winning-event-xyz");

    console.log("STEP 6: inspect IndexedDB after reload");
    const verification = await page.evaluate(async () => {
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
          const store = tx.objectStore(storeName);
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(request.error ?? new Error(`Failed to read ${storeName}.`));
        });
      }

      function get(storeName, key) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () =>
            reject(request.error ?? new Error(`Failed to read ${storeName}:${key}.`));
        });
      }

      const manifest = await get("manifest", "current");
      const queue = await getAll("queue");
      const results = await getAll("results");
      const checkedIn = await getAll("checkedIn");

      db.close();

      return {
        manifestVersion: manifest?.version ?? null,
        queueStatuses: queue.map((item) => item.status),
        queueTicketRefs: queue.map((item) => item.ticketRef),
        resultKinds: results.map((item) => item.result),
        checkedInCount: checkedIn.length,
      };
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          verification,
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

async function seedIndexedDb(page) {
  await page.evaluate(async (state) => {
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
        tx.onabort = () =>
          reject(tx.error ?? new Error(`Transaction aborted for ${storeName}.`));
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

    await put(db, "assignment", state.assignment, "current");
    await put(db, "manifest", state.manifest, "current");

    for (const queueItem of state.queue) {
      await put(db, "queue", queueItem);
    }

    for (const result of state.results) {
      await put(db, "results", result);
    }

    for (const ticketRef of state.checkedIn) {
      await put(db, "checkedIn", { ticketRef });
    }

    await put(db, "meta", state.lastSuccessfulSyncAt, "lastSuccessfulSyncAt");

    db.close();
  }, seededState);
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
