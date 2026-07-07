"use client";

import { readMap, readRaw, subscribeToStorageKeys, writeMap } from "./browser-storage";
import type { ActiveReservationRecord, BuyerInfo, OrderRecord, TicketRecord } from "./types";

const activeReservationsKey = "ticketbox.audience.active-reservations";
const ordersKey = "ticketbox.mock.orders";
const ticketsKey = "ticketbox.mock.tickets";

export interface UserAccountSnapshot {
  activeReservations: ActiveReservationRecord[];
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
  return { activeReservations: [], profile: fallbackProfile, orders: [], tickets: [] };
}

export function getUserAccountSnapshot(): UserAccountSnapshot {
  const activeReservations = getActiveReservations();
  const orders = Object.values(readMap<OrderRecord>(ordersKey)).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const tickets = Object.values(readMap<TicketRecord>(ticketsKey)).sort(
    (left, right) => new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime(),
  );
  const profile = activeReservations[0]?.buyer ?? orders[0]?.buyer ?? tickets[0]?.owner ?? fallbackProfile;

  return { activeReservations, profile, orders, tickets };
}

export function getUserAccountStorageVersion(): string {
  return `${readRaw(activeReservationsKey)}|${readRaw(ordersKey)}|${readRaw(ticketsKey)}`;
}

export function subscribeToUserAccountStorage(onChange: () => void): () => void {
  return subscribeToStorageKeys([activeReservationsKey, ordersKey, ticketsKey], onChange);
}

export function findActiveReservation(match: {
  concertId: string;
  ticketTypeId: string;
  buyerEmail?: string;
}): ActiveReservationRecord | null {
  return (
    getActiveReservations().find(
      (reservation) =>
        reservation.concertId === match.concertId &&
        reservation.ticketTypeId === match.ticketTypeId &&
        (!match.buyerEmail || reservation.buyer.email === match.buyerEmail),
    ) ?? null
  );
}

export function upsertActiveReservation(reservation: ActiveReservationRecord): void {
  const nextReservations = {
    ...readMap<ActiveReservationRecord>(activeReservationsKey),
    [reservation.reservationId]: reservation,
  };
  writeMap(activeReservationsKey, pruneExpiredReservations(nextReservations));
}

export function clearActiveReservation(reservationId: string): void {
  const reservations = { ...readMap<ActiveReservationRecord>(activeReservationsKey) };
  delete reservations[reservationId];
  writeMap(activeReservationsKey, pruneExpiredReservations(reservations));
}

export function upsertOrderRecord(order: OrderRecord): void {
  const existingOrder = readMap<OrderRecord>(ordersKey)[order.orderId];
  const nextOrders = {
    ...readMap<OrderRecord>(ordersKey),
    [order.orderId]: {
      ...order,
      buyer: existingOrder?.buyer ?? order.buyer,
      createdAt: existingOrder?.createdAt ?? order.createdAt,
    },
  };
  writeMap(ordersKey, nextOrders);
  if (order.reservationId) clearActiveReservation(order.reservationId);
}

export function upsertTicketRecord(ticket: TicketRecord): void {
  const nextTickets = {
    ...readMap<TicketRecord>(ticketsKey),
    [ticket.ticketId]: ticket,
  };
  writeMap(ticketsKey, nextTickets);
}

function getActiveReservations(now: Date = new Date()): ActiveReservationRecord[] {
  return Object.values(pruneExpiredReservations(readMap<ActiveReservationRecord>(activeReservationsKey), now)).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

function pruneExpiredReservations(
  reservations: Record<string, ActiveReservationRecord>,
  now: Date = new Date(),
): Record<string, ActiveReservationRecord> {
  return Object.fromEntries(
    Object.entries(reservations).filter(([, reservation]) => Date.parse(reservation.expiresAt) > now.getTime()),
  );
}
