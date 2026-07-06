import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { constants } from 'node:fs';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import {
  isSafeArtistBioObjectKey,
  validateArtistBioMime,
  validateArtistBioSignature,
} from './artist-bio-validation.util';

const MAX_PDF_SIZE = 10 * 1024 * 1024;

@Injectable()
export class ArtistBioStorageService implements OnModuleInit {
  private readonly logger = new Logger(ArtistBioStorageService.name);
  private readonly storageDir: string;

  constructor() {
    this.storageDir = resolve(
      process.env.ARTIST_BIO_STORAGE_DIR ?? 'storage/artist-bios',
    );
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });
    try {
      await access(this.storageDir, constants.W_OK);
    } catch {
      throw new Error(
        `Artist bio storage directory is not writable: ${this.storageDir}`,
      );
    }
    this.logger.log(`Artist bio storage ready at ${this.storageDir}`);
  }

  async save(
    concertId: string,
    checksum: string,
    mime: string,
    buffer: Buffer,
  ): Promise<{ objectKey: string }> {
    if (buffer.length === 0) {
      throw new BadRequestException('Artist bio PDF is required');
    }
    if (buffer.length > MAX_PDF_SIZE) {
      throw new BadRequestException('Artist bio PDF exceeds the 10 MB limit');
    }

    validateArtistBioMime(mime);
    validateArtistBioSignature(buffer);

    const objectKey = this.buildObjectKey(concertId, checksum);
    const filePath = this.resolveObjectPath(objectKey);
    const tempPath = `${filePath}.${randomUUID()}.tmp`;

    try {
      await writeFile(tempPath, buffer);
      await rename(tempPath, filePath);
    } catch {
      await unlink(tempPath).catch(() => {});
      throw new InternalServerErrorException(
        'Failed to write artist bio PDF to storage',
      );
    }

    return { objectKey };
  }

  async read(objectKey: string): Promise<Buffer> {
    return readFile(this.resolveObjectPath(objectKey));
  }

  async delete(objectKey: string): Promise<void> {
    await unlink(this.resolveObjectPath(objectKey)).catch(() => {});
  }

  buildObjectKey(concertId: string, checksum: string): string {
    return `${concertId}-${checksum}.pdf`;
  }

  private resolveObjectPath(objectKey: string): string {
    if (!isSafeArtistBioObjectKey(objectKey)) {
      throw new BadRequestException('Invalid artist bio object key');
    }
    return join(this.storageDir, objectKey);
  }
}
