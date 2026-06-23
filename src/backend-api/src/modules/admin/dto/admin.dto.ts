import { BadRequestException } from '@nestjs/common';

export interface ConcertBody {
  title?: string;
  venue?: string;
  artistName?: string;
  description?: string | null;
  startAt?: string;
  status?: 'draft' | 'published' | 'canceled';
  seatingMapObjectKey?: string;
  publishedArtistBio?: string;
}

export interface TicketTypeBody {
  zoneCode?: string;
  name?: string;
  price?: string | number;
  capacity?: number;
  perUserLimit?: number;
  saleStartAt?: string;
  saleEndAt?: string;
}

const concertStatuses = ['draft', 'published', 'canceled'];

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${field} is required`);
  }

  return value.trim();
}

export function optionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireString(value, field);
}

export function optionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return requireString(value, field);
}

export function parseDate(value: unknown, field: string): Date {
  const raw = requireString(value, field);
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be an ISO date`);
  }

  return date;
}

export function optionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseDate(value, field);
}

export function parsePositiveInt(value: unknown, field: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new BadRequestException(`${field} must be a positive integer`);
  }

  return Number(value);
}

export function optionalPositiveInt(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parsePositiveInt(value, field);
}

export function parsePrice(value: unknown): string {
  const price = Number(value);

  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    String(value).trim().length === 0 ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    throw new BadRequestException('price must be a non-negative number');
  }

  return price.toFixed(2);
}

export function optionalPrice(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parsePrice(value);
}

export function parseConcertStatus(value: unknown) {
  if (typeof value !== 'string' || !concertStatuses.includes(value)) {
    throw new BadRequestException(
      'status must be draft, published, or canceled',
    );
  }

  return value as 'draft' | 'published' | 'canceled';
}

export function optionalConcertStatus(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return parseConcertStatus(value);
}
