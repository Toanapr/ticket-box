import { BadRequestException } from '@nestjs/common';

export const GUEST_LIST_SCHEMA_VERSION = 'guest-list-v1';

export interface ParsedGuestCsvRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface ParsedGuestCsv {
  headers: string[];
  rows: ParsedGuestCsvRow[];
  delimiter: string;
}

const allowedHeaders = new Set([
  'full_name',
  'email',
  'phone',
  'sponsor_id',
  'zone_code',
  'ticket_type_slug',
]);

const requiredHeaderGroups = [
  ['full_name'],
  ['email', 'phone', 'sponsor_id'],
  ['zone_code', 'ticket_type_slug'],
];

export function parseGuestListCsv(buffer: Buffer): ParsedGuestCsv {
  const text = decodeCsv(buffer).replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const records = parseDelimited(text, delimiter)
    .map((fields) => fields.map((field) => field.trim()))
    .filter((fields) => fields.some((field) => field.length > 0));

  if (records.length === 0) {
    throw new BadRequestException('CSV file is empty');
  }

  const headers = records[0].map((header) => normalizeHeader(header));
  if (headers.some((header) => header.length === 0)) {
    throw new BadRequestException('CSV contains an empty header');
  }

  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );
  if (duplicateHeaders.length > 0) {
    throw new BadRequestException(
      `CSV contains duplicate headers: ${Array.from(new Set(duplicateHeaders)).join(', ')}`,
    );
  }

  const unknownHeaders = headers.filter((header) => !allowedHeaders.has(header));
  if (unknownHeaders.length > 0) {
    throw new BadRequestException(
      `CSV contains unsupported headers: ${unknownHeaders.join(', ')}`,
    );
  }

  for (const group of requiredHeaderGroups) {
    if (!group.some((header) => headers.includes(header))) {
      throw new BadRequestException(
        `CSV must include one of: ${group.join(', ')}`,
      );
    }
  }

  const rows = records.slice(1).map((record, index) => {
    const values: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      values[header] = record[headerIndex]?.trim() ?? '';
    });
    return { rowNumber: index + 2, values };
  });

  if (rows.length === 0) {
    throw new BadRequestException('CSV must include at least one guest row');
  }

  return { headers, rows, delimiter };
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  return email;
}

export function normalizePhone(value: string): string | null {
  const phone = value.replace(/[^0-9+]/g, '');
  if (!phone) return null;
  return phone.startsWith('+') ? `+${phone.slice(1).replace(/\+/g, '')}` : phone;
}

export function normalizeSponsorId(value: string): string | null {
  const sponsorId = value.trim().toLowerCase();
  return sponsorId || null;
}

export function identityKey(values: {
  email?: string | null;
  phone?: string | null;
  sponsorId?: string | null;
}): string | null {
  if (values.email) return `email:${values.email}`;
  if (values.phone) return `phone:${values.phone}`;
  if (values.sponsorId) return `sponsor:${values.sponsorId}`;
  return null;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function decodeCsv(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    throw new BadRequestException('UTF-16BE CSV is not supported');
  }
  if (buffer.includes(0)) {
    throw new BadRequestException('CSV encoding must be UTF-8 or UTF-16LE');
  }
  return buffer.toString('utf8');
}

function detectDelimiter(headerLine: string): string {
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = headerLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[ -]+/g, '_');
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (quoted) {
    throw new BadRequestException('CSV contains an unterminated quoted field');
  }

  row.push(field);
  rows.push(row);
  return rows;
}
