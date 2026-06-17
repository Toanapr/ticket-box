"use client";

export function readMap<T>(key: string): Record<string, T> {
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as Record<string, T>) : {};
}

export function writeMap<T>(key: string, value: Record<string, T>): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}
