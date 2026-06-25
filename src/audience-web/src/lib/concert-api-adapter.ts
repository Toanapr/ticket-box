import {
  ConcertContractError,
  parseConcertApiList,
  parseConcertApiRecord,
  type ConcertApiRecord,
} from "./concert-api-contract";
import type { ConcertDetail, ConcertStatus, TicketType } from "./types";

const supportedZones = ["svip", "vip", "cat1", "cat2", "ga"] as const;

export function normalizeConcertList(value: unknown, now = new Date()): ConcertDetail[] {
  return parseConcertApiList(value).map((concert) => normalizeConcertRecord(concert, now));
}

export function normalizeConcertDetail(value: unknown, now = new Date()): ConcertDetail {
  return normalizeConcertRecord(parseConcertApiRecord(value), now);
}

function normalizeConcertRecord(concert: ConcertApiRecord, now: Date): ConcertDetail {
  const ticketTypes = concert.ticketTypes.map(normalizeTicketType);
  return {
    id: concert.id,
    slug: concert.slug,
    title: concert.title,
    artists: [concert.artistName],
    venue: concert.venue,
    startsAt: concert.startAt,
    status: deriveSaleStatus(ticketTypes, now),
    description: concert.description ?? concert.publishedArtistBio,
    seatingMapVersion: concert.seatingMapObjectKey,
    posterPath: concert.posterObjectKey
      ? `/api/media/concert-posters/${encodeURIComponent(concert.posterObjectKey)}`
      : undefined,
    ticketTypes,
  };
}

function normalizeTicketType(ticketType: ConcertApiRecord["ticketTypes"][number]): TicketType {
  const zone = ticketType.zoneCode.toLowerCase();
  if (!isSupportedZone(zone)) {
    throw new ConcertContractError(`unsupported ticket zone ${ticketType.zoneCode}`);
  }

  const normalized: TicketType = {
    id: ticketType.id,
    slug: ticketType.slug,
    zone,
    name: ticketType.name,
    price: Number(ticketType.price),
    maxPerUser: ticketType.perUserLimit,
    availableApprox: ticketType.availableCount,
    capacity: ticketType.capacity,
    saleStartsAt: ticketType.saleStartAt,
    saleEndsAt: ticketType.saleEndAt,
  };
  if (ticketType.cachedAt) normalized.inventoryCachedAt = ticketType.cachedAt;
  if (ticketType.staleAt) normalized.inventoryStaleAt = ticketType.staleAt;
  if (ticketType.inventoryState) normalized.inventoryState = ticketType.inventoryState;
  return normalized;
}

function deriveSaleStatus(ticketTypes: TicketType[], now: Date): ConcertStatus {
  if (ticketTypes.length === 0) return "upcoming";

  const nowMs = now.getTime();
  const hasActiveInventory = ticketTypes.some(
    (ticketType) =>
      Date.parse(ticketType.saleStartsAt) <= nowMs &&
      Date.parse(ticketType.saleEndsAt) >= nowMs &&
      ticketType.availableApprox > 0,
  );
  if (hasActiveInventory) return "selling";

  const hasFutureSale = ticketTypes.some((ticketType) => Date.parse(ticketType.saleStartsAt) > nowMs);
  return hasFutureSale ? "upcoming" : "soldout";
}

function isSupportedZone(value: string): value is TicketType["zone"] {
  return supportedZones.some((zone) => zone === value);
}
