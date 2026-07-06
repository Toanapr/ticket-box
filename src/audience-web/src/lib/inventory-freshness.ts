import type { InventoryState, TicketType } from "./types";

export interface InventoryFreshnessDisplay {
  label: string;
  tone: "green" | "amber" | "slate";
}

export function deriveInventoryState(ticketType: Pick<TicketType, "inventoryCachedAt" | "inventoryStaleAt" | "inventoryState">, now = new Date()): InventoryState {
  if (ticketType.inventoryState) return ticketType.inventoryState;
  if (ticketType.inventoryStaleAt && Date.parse(ticketType.inventoryStaleAt) <= now.getTime()) return "stale";
  if (ticketType.inventoryCachedAt) return "cached";
  return "fresh";
}

export function formatInventoryFreshness(ticketType: Pick<TicketType, "inventoryCachedAt" | "inventoryStaleAt" | "inventoryState">, now = new Date()): InventoryFreshnessDisplay {
  const state = deriveInventoryState(ticketType, now);
  if (state === "stale") return { label: "Dữ liệu có thể chậm vài giây", tone: "amber" };
  if (state === "cached") return { label: "Cập nhật gần đây", tone: "slate" };
  return { label: "Gan realtime", tone: "green" };
}
