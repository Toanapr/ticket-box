import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

export const ARTIST_BIO_MAX_PDF_BYTES = 10 * 1024 * 1024;

const PDF_SIGNATURE = Buffer.from('%PDF-');

export function validateArtistBioPdf(file: Express.Multer.File): void {
  if (
    !file.originalname ||
    extname(file.originalname).toLowerCase() !== '.pdf'
  ) {
    throw new BadRequestException(
      'Artist bio source must use the .pdf extension',
    );
  }

  if (file.mimetype !== 'application/pdf') {
    throw new BadRequestException('Artist bio source must be application/pdf');
  }

  if (file.buffer.length > ARTIST_BIO_MAX_PDF_BYTES) {
    throw new BadRequestException('Artist bio PDF exceeds the 10 MB limit');
  }

  if (!hasPdfSignature(file.buffer)) {
    throw new BadRequestException('Artist bio source is not a valid PDF file');
  }
}

export function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);
}

export function isSafeArtistBioObjectKey(objectKey: string): boolean {
  return /^[0-9a-f-]{36}\/[a-f0-9]{64}\/v[0-9]+-[0-9a-f-]{36}\.pdf$/i.test(
    objectKey,
  );
}
