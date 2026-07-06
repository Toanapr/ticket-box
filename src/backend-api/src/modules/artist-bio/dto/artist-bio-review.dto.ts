import { BadRequestException } from '@nestjs/common';

export interface ArtistBioDraftBody {
  content?: unknown;
}

export function requireArtistBioDraftContent(
  body: ArtistBioDraftBody,
  field = 'content',
): string {
  if (typeof body.content !== 'string') {
    throw new BadRequestException(`${field} must be a string`);
  }

  const value = body.content.trim();
  if (value.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }

  if (value.length > 10_000) {
    throw new BadRequestException(`${field} exceeds the 10000 character limit`);
  }

  return value;
}
