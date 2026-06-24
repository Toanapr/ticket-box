export interface ConcertApiTicketType {
  id: string;
  slug: string;
  zoneCode: string;
  name: string;
  price: string | number;
  capacity: number;
  perUserLimit: number;
  saleStartAt: string;
  saleEndAt: string;
  availableCount: number;
}

export interface ConcertApiRecord {
  id: string;
  slug: string;
  title: string;
  venue: string;
  artistName: string;
  description: string | null;
  startAt: string;
  status: "published";
  seatingMapObjectKey: string;
  publishedArtistBio: string;
  ticketTypes: ConcertApiTicketType[];
}

export class ConcertContractError extends Error {
  constructor(message: string) {
    super(`Invalid concert API response: ${message}`);
    this.name = "ConcertContractError";
  }
}

export function parseConcertApiList(value: unknown): ConcertApiRecord[] {
  if (!Array.isArray(value)) throw new ConcertContractError("expected a concert array");
  return value.map((item, index) => parseConcertApiRecord(item, `concerts[${index}]`));
}

export function parseConcertApiRecord(value: unknown, path = "concert"): ConcertApiRecord {
  const record = readObject(value, path);
  const status = readString(record.status, `${path}.status`);
  if (status !== "published") throw new ConcertContractError(`${path}.status must be published`);

  const ticketTypes = record.ticketTypes;
  if (!Array.isArray(ticketTypes)) throw new ConcertContractError(`${path}.ticketTypes must be an array`);

  return {
    id: readUuid(record.id, `${path}.id`),
    slug: readSlug(record.slug, `${path}.slug`),
    title: readString(record.title, `${path}.title`),
    venue: readString(record.venue, `${path}.venue`),
    artistName: readString(record.artistName, `${path}.artistName`),
    description: readNullableString(record.description, `${path}.description`),
    startAt: readIsoDate(record.startAt, `${path}.startAt`),
    status,
    seatingMapObjectKey: readString(record.seatingMapObjectKey, `${path}.seatingMapObjectKey`),
    publishedArtistBio: readString(record.publishedArtistBio, `${path}.publishedArtistBio`),
    ticketTypes: ticketTypes.map((item, index) => parseTicketType(item, `${path}.ticketTypes[${index}]`)),
  };
}

function parseTicketType(value: unknown, path: string): ConcertApiTicketType {
  const record = readObject(value, path);
  return {
    id: readUuid(record.id, `${path}.id`),
    slug: readSlug(record.slug, `${path}.slug`),
    zoneCode: readString(record.zoneCode, `${path}.zoneCode`),
    name: readString(record.name, `${path}.name`),
    price: readNonNegativeNumberLike(record.price, `${path}.price`),
    capacity: readNonNegativeInteger(record.capacity, `${path}.capacity`),
    perUserLimit: readNonNegativeInteger(record.perUserLimit, `${path}.perUserLimit`),
    saleStartAt: readIsoDate(record.saleStartAt, `${path}.saleStartAt`),
    saleEndAt: readIsoDate(record.saleEndAt, `${path}.saleEndAt`),
    availableCount: readNonNegativeInteger(record.availableCount, `${path}.availableCount`),
  };
}

function readObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConcertContractError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConcertContractError(`${path} must be a non-empty string`);
  }
  return value;
}

function readNullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  return readString(value, path);
}

function readUuid(value: unknown, path: string): string {
  const result = readString(value, path);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new ConcertContractError(`${path} must be a UUID`);
  }
  return result;
}

function readSlug(value: unknown, path: string): string {
  const result = readString(value, path);
  if (result.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) {
    throw new ConcertContractError(`${path} must be a URL-safe slug`);
  }
  return result;
}

function readIsoDate(value: unknown, path: string): string {
  const result = readString(value, path);
  if (Number.isNaN(Date.parse(result))) throw new ConcertContractError(`${path} must be an ISO date`);
  return result;
}

function readNonNegativeNumberLike(value: unknown, path: string): number {
  const result = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof result !== "number" || !Number.isFinite(result) || result < 0) {
    throw new ConcertContractError(`${path} must be a non-negative number`);
  }
  return result;
}

function readNonNegativeInteger(value: unknown, path: string): number {
  const result = readNonNegativeNumberLike(value, path);
  if (!Number.isInteger(result)) throw new ConcertContractError(`${path} must be an integer`);
  return result;
}
