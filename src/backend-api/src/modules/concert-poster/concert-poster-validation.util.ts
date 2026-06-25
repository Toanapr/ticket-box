import { BadRequestException } from '@nestjs/common';

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP_SIGNATURE = [0x52, 0x49, 0x46, 0x46];

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const POSTER_OBJECT_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+(?:-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.(jpg|png|webp)$/i;

export type DetectedFormat = 'jpg' | 'png' | 'webp';

export function validatePosterMime(mime: string): DetectedFormat {
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new BadRequestException(
      `Unsupported MIME type "${mime}". Only JPEG, PNG, and WebP are allowed.`,
    );
  }

  return mime === 'image/jpeg' ? 'jpg' : (mime.slice(6) as DetectedFormat);
}

export function isSafePosterObjectKey(objectKey: string): boolean {
  return POSTER_OBJECT_KEY_PATTERN.test(objectKey);
}

export function validatePosterSignature(buffer: Buffer): DetectedFormat {
  if (buffer.length < 12) {
    throw new BadRequestException('File is too small to be a valid image');
  }

  if (startsWith(buffer, JPEG_SIGNATURE)) {
    return 'jpg';
  }

  if (startsWith(buffer, PNG_SIGNATURE)) {
    return 'png';
  }

  if (startsWith(buffer, WEBP_SIGNATURE) && isWebP(buffer)) {
    return 'webp';
  }

  throw new BadRequestException(
    'Invalid image signature. Only JPEG, PNG, and WebP are allowed.',
  );
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }
  return true;
}

function isWebP(buffer: Buffer): boolean {
  if (buffer.length < 16) return false;
  return (
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  );
}
