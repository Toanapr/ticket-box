const DATABASE_NAME = "ticketbox-scanner";
const DATABASE_VERSION = 1;

type StoreName =
  | "assignment"
  | "manifest"
  | "queue"
  | "results"
  | "checkedIn"
  | "meta";

function ensureIndexedDbAvailable() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    throw new Error("IndexedDB is not available in the current environment.");
  }
}

export function openScannerDatabase(): Promise<IDBDatabase> {
  ensureIndexedDbAvailable();

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

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
      reject(request.error ?? new Error("Failed to open scanner IndexedDB."));
  });
}

function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openScannerDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = executor(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error(`IndexedDB ${storeName} operation failed.`));
        transaction.oncomplete = () => database.close();
        transaction.onerror = () =>
          reject(
            transaction.error ??
              new Error(`IndexedDB transaction failed for ${storeName}.`),
          );
      }),
  );
}

export function idbGet<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withStore<T | undefined>(storeName, "readonly", (store) => store.get(key));
}

export function idbSet<T>(storeName: StoreName, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
  return withStore<IDBValidKey>(storeName, "readwrite", (store) =>
    key === undefined ? store.put(value) : store.put(value, key),
  );
}

export function idbDelete(storeName: StoreName, key: IDBValidKey): Promise<undefined> {
  return withStore<undefined>(storeName, "readwrite", (store) => store.delete(key));
}

export function idbClear(storeName: StoreName): Promise<undefined> {
  return withStore<undefined>(storeName, "readwrite", (store) => store.clear());
}

export function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  return withStore<T[]>(storeName, "readonly", (store) => store.getAll());
}
