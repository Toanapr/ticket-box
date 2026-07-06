import {
  concertSlugCandidate,
  slugifyPublicLabel,
} from '../concert/concert-slug.util';

export function slugifyTicketTypeName(name: string): string {
  return slugifyPublicLabel(name, 'ticket');
}

export function ticketTypeSlugCandidate(
  baseSlug: string,
  attempt: number,
): string {
  return concertSlugCandidate(baseSlug, attempt);
}
