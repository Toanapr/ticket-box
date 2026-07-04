import { BadRequestException, Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { hasPdfSignature } from './artist-bio-validation.util';

export const ARTIST_BIO_MAX_INPUT_CHARS = 12_000;

@Injectable()
export class ArtistBioTextService {
  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    if (!hasPdfSignature(buffer)) {
      throw new BadRequestException('PDF is unreadable or invalid');
    }

    try {
      const parsed = await pdfParse(buffer);
      return this.sanitizeAndLimit(parsed.text);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `PDF is unreadable or invalid: ${errorMessage(error)}`,
      );
    }
  }

  sanitizeAndLimit(text: string): string {
    const cleaned = replaceControlCharacters(text)
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      throw new BadRequestException('PDF does not contain extractable text');
    }

    return cleaned.slice(0, ARTIST_BIO_MAX_INPUT_CHARS);
  }
}

function replaceControlCharacters(text: string): string {
  return Array.from(text)
    .map((char) => {
      if (char === '\t' || char === '\n' || char === '\r') {
        return ' ';
      }

      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : char;
    })
    .join('');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
