"use client";

const storagePrefix = "ticketbox:sale-access:";

export interface SaleAccessTokenRecord {
  token: string;
  expiresAt?: string;
  issuedAt?: string;
  queueId?: string;
}

export function getSaleAccessToken(concertId: string, now = new Date()): SaleAccessTokenRecord | null {
  const record = readSaleAccessToken(concertId);
  if (!record) return null;
  if (isSaleAccessTokenExpired(record, now)) {
    clearSaleAccessToken(concertId);
    return null;
  }
  return record;
}

export function setSaleAccessToken(concertId: string, record: SaleAccessTokenRecord): void {
  if (!hasSessionStorage()) return;
  window.sessionStorage.setItem(storageKey(concertId), JSON.stringify(record));
}

export function clearSaleAccessToken(concertId: string): void {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(storageKey(concertId));
}

export function isSaleAccessTokenExpired(record: SaleAccessTokenRecord, now = new Date()): boolean {
  return Boolean(record.expiresAt && Date.parse(record.expiresAt) <= now.getTime());
}

function readSaleAccessToken(concertId: string): SaleAccessTokenRecord | null {
  if (!hasSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(storageKey(concertId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SaleAccessTokenRecord>;
    if (typeof value.token === "string" && value.token.trim() !== "") {
      return {
        token: value.token,
        expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : undefined,
        issuedAt: typeof value.issuedAt === "string" ? value.issuedAt : undefined,
        queueId: typeof value.queueId === "string" ? value.queueId : undefined,
      };
    }
  } catch {
    clearSaleAccessToken(concertId);
  }
  return null;
}

function storageKey(concertId: string): string {
  return `${storagePrefix}${concertId}`;
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}
