"use client";

import { readMap } from "./browser-storage";
import type { BuyerInfo, OrderRecord, TicketRecord } from "./types";

const ordersKey = "ticketbox.mock.orders";
const ticketsKey = "ticketbox.mock.tickets";

export interface UserAccountSnapshot {
  profile: BuyerInfo;
  orders: OrderRecord[];
  tickets: TicketRecord[];
}

const fallbackProfile: BuyerInfo = {
  fullName: "Khán giả TicketBox",
  phone: "Chưa cập nhật",
  email: "guest@ticketbox.local",
};

export function getFallbackUserAccountSnapshot(): UserAccountSnapshot {
  return { profile: fallbackProfile, orders: [], tickets: [] };
}

export function getUserAccountSnapshot(): UserAccountSnapshot {
  const orders = Object.values(readMap<OrderRecord>(ordersKey)).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const tickets = Object.values(readMap<TicketRecord>(ticketsKey)).sort(
    (left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
  );
  const profile = orders[0]?.buyer ?? tickets[0]?.owner ?? fallbackProfile;

  return { profile, orders, tickets };
}

export function getUserAccountStorageVersion(): string {
  return `${window.localStorage.getItem(ordersKey) ?? ""}|${window.localStorage.getItem(ticketsKey) ?? ""}`;
}

export function subscribeToUserAccountStorage(onChange: () => void): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key === ordersKey || event.key === ticketsKey) {
      onChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
}
