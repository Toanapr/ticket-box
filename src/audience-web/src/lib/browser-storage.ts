"use client";

const storageChangeEventName = "ticketbox:storage-change";

export function readMap<T>(key: string): Record<string, T> {
  if (!isBrowser()) return {};
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as Record<string, T>) : {};
}

export function writeMap<T>(key: string, value: Record<string, T>): void {
  if (!isBrowser()) return;
  if (Object.keys(value).length === 0) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
  window.dispatchEvent(new CustomEvent(storageChangeEventName, { detail: { key } }));
}

export function subscribeToStorageKeys(keys: string[], onChange: () => void): () => void {
  if (!isBrowser()) return () => {};
  const watchedKeys = new Set(keys);

  function handleStorage(event: StorageEvent): void {
    if (event.key && watchedKeys.has(event.key)) onChange();
  }

  function handleCustomEvent(event: Event): void {
    const key = (event as CustomEvent<{ key?: string }>).detail?.key;
    if (key && watchedKeys.has(key)) onChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(storageChangeEventName, handleCustomEvent);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(storageChangeEventName, handleCustomEvent);
  };
}

export function readRaw(key: string): string {
  if (!isBrowser()) return "";
  return window.localStorage.getItem(key) ?? "";
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}
