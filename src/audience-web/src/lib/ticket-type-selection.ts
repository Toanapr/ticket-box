import type { ConcertDetail, TicketType } from "./types";

export interface TicketTypeSelection {
  ticketType: TicketType | undefined;
  canonicalIdentifier: string | undefined;
}

export function resolveTicketTypeSelection(
  concert: ConcertDetail,
  identifier: string | undefined,
): TicketTypeSelection {
  const requested = identifier
    ? concert.ticketTypes.find((ticketType) => ticketType.slug === identifier || ticketType.id === identifier)
    : undefined;
  const ticketType =
    requested ?? concert.ticketTypes.find((item) => item.availableApprox > 0) ?? concert.ticketTypes[0];

  return {
    ticketType,
    canonicalIdentifier: requested?.slug ?? identifier,
  };
}
