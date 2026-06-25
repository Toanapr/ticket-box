"use client";

import { makeIdempotencyKey } from "./format";

const storagePrefix = "ticketbox:checkout-intent:";

export interface CheckoutIntentInput {
  concertId: string;
  ticketTypeId: string;
  quantity: number;
  userKey: string;
}

export interface CheckoutIntent extends CheckoutIntentInput {
  reservationIdempotencyKey: string;
  orderIdempotencyKey: string;
  createdAt: string;
}

export function getCheckoutIntent(input: CheckoutIntentInput): CheckoutIntent {
  const signature = checkoutIntentSignature(input);
  const existing = readStoredIntent(signature);
  if (existing && checkoutIntentSignature(existing) === signature) return existing;

  const next: CheckoutIntent = {
    ...input,
    reservationIdempotencyKey: makeIdempotencyKey("reservation"),
    orderIdempotencyKey: makeIdempotencyKey("order"),
    createdAt: new Date().toISOString(),
  };
  writeStoredIntent(signature, next);
  return next;
}

export function clearCheckoutIntent(input: CheckoutIntentInput): void {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(storageKey(checkoutIntentSignature(input)));
}

export function checkoutIntentSignature(input: CheckoutIntentInput): string {
  return [input.concertId, input.ticketTypeId, input.quantity.toString(), input.userKey || "anonymous"].join(":");
}

function readStoredIntent(signature: string): CheckoutIntent | null {
  if (!hasSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(storageKey(signature));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CheckoutIntent>;
    if (
      typeof value.concertId === "string" &&
      typeof value.ticketTypeId === "string" &&
      typeof value.quantity === "number" &&
      typeof value.userKey === "string" &&
      typeof value.reservationIdempotencyKey === "string" &&
      typeof value.orderIdempotencyKey === "string" &&
      typeof value.createdAt === "string"
    ) {
      return value as CheckoutIntent;
    }
  } catch {
    window.sessionStorage.removeItem(storageKey(signature));
  }
  return null;
}

function writeStoredIntent(signature: string, intent: CheckoutIntent): void {
  if (!hasSessionStorage()) return;
  window.sessionStorage.setItem(storageKey(signature), JSON.stringify(intent));
}

function storageKey(signature: string): string {
  return `${storagePrefix}${signature}`;
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}
