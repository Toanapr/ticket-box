import { chromium } from "playwright";

const APP_URL = process.env.SCANNER_PWA_URL ?? "http://localhost:3000";
const executablePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  "C:/Users/Admin/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();

const validState = {
  assignment: {
    assignmentId: "assign-scan-test",
    deviceId: "scanner-device-01",
    scannerUserId: "scanner-user-01",
    status: "active",
    eventId: "event-scan-01",
    concertId: "concert-scan-01",
    gateCode: "GATE-A",
    zoneCode: "ZONE-1",
    manifestVersion: 12,
    manifestGeneratedAt: new Date().toISOString(),
    manifestExpiresAt: futureExpiry,
  },
  manifest: {
    assignmentId: "assign-scan-test",
    eventId: "event-scan-01",
    concertId: "concert-scan-01",
    gateCode: "GATE-A",
    zoneCode: "ZONE-1",
    version: 12,
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
        ticketRef: "TICKET-OFFLINE-001",
        rawToken: "RAW-TOKEN-001",
        ticketId: "ticket-1",
        ticketTypeId: "general",
        status: "valid",
        eventId: "event-scan-01",
        gateCode: "GATE-A",
        zoneCode: "ZONE-1",
      },
      {
        ticketRef: "TICKET-SECOND-002",
        rawToken: "RAW-TOKEN-002",
        ticketId: "ticket-2",
        ticketTypeId: "vip",
        status: "valid",
        eventId: "event-scan-01",
        gateCode: "GATE-A",
        zoneCode: "ZONE-1",
      },
    ],
    revokedTickets: [],
    guestList: [],
  },
  queue: [],
  results: [],
  checkedIn: [],
};

const expiredState = {
  ...validState,
  assignment: {
    ...validState.assignment,
    manifestGeneratedAt: expiredAt,
    manifestExpiresAt: expiredAt,
  },
  manifest: {
    ...validState.manifest,
    generatedAt: expiredAt,
    expiresAt: expiredAt,
  },
};

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("STEP 1: open scanner page");
    await page.goto(`${APP_URL}/scanner`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Offline Scan Core");

    console.log("STEP 2: seed valid scanner state");
    await seedIndexedDb(page, validState);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Ready for offline scanning");

    console.log("STEP 3: switch to offline mode");
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });
    await page.waitForSelector("text=offline");

    console.log("STEP 4: record manual offline scan");
    await page.getByPlaceholder(
      'Paste raw QR string or JSON like {"ticketRef":"...","rawToken":"..."}',
    ).fill('{"ticketRef":"TICKET-OFFLINE-001","rawToken":"RAW-TOKEN-001"}');
    await page.getByRole("button", { name: "Record local scan" }).click();
    await page.waitForSelector("text=Recorded locally, pending sync");
    await page.waitForSelector("text=Ticket TICKET-OFFLINE-001 is queued for backend sync.");

    const firstVerification = await inspectLocalState(page);

    console.log("STEP 5: reject duplicate local scan on same device");
    await page.getByPlaceholder(
      'Paste raw QR string or JSON like {"ticketRef":"...","rawToken":"..."}',
    ).fill('{"ticketRef":"TICKET-OFFLINE-001","rawToken":"RAW-TOKEN-001"}');
    await page.getByRole("button", { name: "Record local scan" }).click();
    await page.waitForSelector("text=Local scan rejected");
    await page.waitForSelector("text=This ticket has already been recorded on this device.");

    const duplicateVerification = await inspectLocalState(page);

    console.log("STEP 6: seed expired manifest and verify scan block");
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });
    await seedIndexedDb(page, expiredState);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Manifest expired");

    const recordButton = page.getByRole("button", { name: "Record local scan" });
    const cameraButton = page.getByRole("button", { name: "Start camera" });
    const expiredVerification = {
      recordDisabled: await recordButton.isDisabled(),
      cameraDisabled: await cameraButton.isDisabled(),
      bodyHasExpiredCopy:
        (await page.textContent("body"))?.includes("Offline scan blocked") ?? false,
    };

    console.log(
      JSON.stringify(
        {
          ok: true,
          firstVerification,
          duplicateVerification,
          expiredVerification,
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
    const checkedIn = await getAll("checkedIn");
    db.close();

    return {
      queueCount: queue.length,
      queueTicketRefs: queue.map((item) => item.ticketRef),
      checkedInCount: checkedIn.length,
      checkedInRefs: checkedIn.map((item) => item.ticketRef),
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
