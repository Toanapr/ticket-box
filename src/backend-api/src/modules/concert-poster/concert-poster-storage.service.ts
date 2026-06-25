import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  access,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import {
  isSafePosterObjectKey,
  validatePosterMime,
  validatePosterSignature,
  type DetectedFormat,
} from './concert-poster-validation.util';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class ConcertPosterStorageService implements OnModuleInit {
  private readonly logger = new Logger(ConcertPosterStorageService.name);
  private readonly storageDir: string;

  constructor() {
    this.storageDir = resolve(
      process.env.CONCERT_POSTER_STORAGE_DIR ?? 'storage/concert-posters',
    );
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });

    try {
      await access(this.storageDir, constants.W_OK);
    } catch {
      throw new Error(
        `Concert poster storage directory is not writable: ${this.storageDir}`,
      );
    }

    this.logger.log(`Concert poster storage ready at ${this.storageDir}`);
  }

  async save(
    concertId: string,
    mime: string,
    buffer: Buffer,
    version: number,
  ): Promise<{ objectKey: string }> {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Poster file exceeds the ${MAX_FILE_SIZE / 1024 / 1024} MB limit`,
      );
    }

    const reportedFormat = validatePosterMime(mime);
    const format = validatePosterSignature(buffer);
    if (reportedFormat !== format) {
      throw new BadRequestException(
        `Poster MIME type ${mime} does not match the detected ${format} image format`,
      );
    }

    const objectKey = this.buildObjectKey(concertId, version, format);
    const filePath = join(this.storageDir, objectKey);
    const tempPath = `${filePath}.${randomUUID()}.tmp`;

    try {
      await writeFile(tempPath, buffer);
      await rename(tempPath, filePath);
    } catch {
      await unlink(tempPath).catch(() => {});
      throw new InternalServerErrorException(
        'Failed to write poster file to storage',
      );
    }

    this.logger.log(`Saved concert poster: ${objectKey}`);

    return { objectKey };
  }

  async delete(objectKey: string): Promise<void> {
    const filePath = this.resolveObjectPath(objectKey);

    try {
      await unlink(filePath);
      this.logger.log(`Deleted concert poster: ${objectKey}`);
    } catch (error: unknown) {
      if (isNodeJsError(error) && error.code === 'ENOENT') {
        this.logger.warn(`Poster file not found for deletion: ${objectKey}`);
        return;
      }
      this.logger.error(
        `Failed to delete poster file: ${objectKey}`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async read(objectKey: string): Promise<Buffer> {
    const filePath = this.resolveObjectPath(objectKey);
    return readFile(filePath);
  }

  async fileExists(objectKey: string): Promise<boolean> {
    try {
      const filePath = this.resolveObjectPath(objectKey);
      await access(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  getStorageDir(): string {
    return this.storageDir;
  }

  buildObjectKey(
    concertId: string,
    version: number,
    format: DetectedFormat,
    uniqueToken = randomUUID(),
  ): string {
    return `${concertId}-${version}-${uniqueToken}.${format}`;
  }

  parseVersion(objectKey: string): number | null {
    const match = objectKey.match(
      /^[0-9a-f-]{36}-(\d+)(?:-[0-9a-f-]{36})?\.(jpg|png|webp)$/i,
    );
    return match ? parseInt(match[1], 10) : null;
  }

  private resolveObjectPath(objectKey: string): string {
    if (!isSafePosterObjectKey(objectKey)) {
      throw new BadRequestException('Invalid poster object key');
    }

    return join(this.storageDir, objectKey);
  }
}

function isNodeJsError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error;
}
