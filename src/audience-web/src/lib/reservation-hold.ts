"use client";

import type { OrderStatus } from "./types";

export function getHoldRemainingMs(expiresAt: string, now: Date = new Date()): number {
  return Math.max(0, Date.parse(expiresAt) - now.getTime());
}

export function formatHoldCountdown(expiresAt: string, now: Date = new Date()): string {
  const remainingSeconds = Math.ceil(getHoldRemainingMs(expiresAt, now) / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function shouldShowOrderHoldCountdown(
  status: OrderStatus,
  expiresAt: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  if (!isPaymentAwaitingResolution(status)) return false;
  return getHoldRemainingMs(expiresAt, now) > 0;
}

function isPaymentAwaitingResolution(status: OrderStatus): boolean {
  return status === "PENDING_PAYMENT" || status === "PAYMENT_DEGRADED" || status === "PAYMENT_PENDING_RECONCILIATION";
}
