import { BadRequestException } from '@nestjs/common';

const allowedMimeTypes = new Set(['application/pdf']);
const objectKeyPattern = /^[0-9a-f-]{36}-[0-9a-f]{64}\.pdf$/i;

export function validateArtistBioMime(mime: string): void {
  if (!allowedMimeTypes.has(mime)) {
    throw new BadRequestException('Artist bio upload must be a PDF file');
  }
}

export function validateArtistBioSignature(buffer: Buffer): void {
  if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new BadRequestException('Uploaded file is not a valid PDF document');
  }
}

export function isSafeArtistBioObjectKey(objectKey: string): boolean {
  return objectKeyPattern.test(objectKey);
}
