import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { constants } from 'node:fs';
import { access, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';

const MAX_CSV_SIZE = 2 * 1024 * 1024;
const objectKeyPattern = /^[0-9a-f-]{36}-[0-9a-f]{64}\.csv$/i;

@Injectable()
export class GuestListStorageService implements OnModuleInit {
  private readonly logger = new Logger(GuestListStorageService.name);
  private readonly storageDir: string;

  constructor() {
    this.storageDir = resolve(
      process.env.GUEST_LIST_STORAGE_DIR ?? 'storage/guest-lists',
    );
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.storageDir, { recursive: true });
    try {
      await access(this.storageDir, constants.W_OK);
    } catch {
      throw new Error(
        `Guest list storage directory is not writable: ${this.storageDir}`,
      );
    }
    this.logger.log(`Guest list storage ready at ${this.storageDir}`);
  }

  async save(concertId: string, checksum: string, buffer: Buffer) {
    if (buffer.length > MAX_CSV_SIZE) {
      throw new BadRequestException('CSV file exceeds the 2 MB limit');
    }

    const objectKey = this.buildObjectKey(concertId, checksum);
    const filePath = this.resolveObjectPath(objectKey);
    const tempPath = `${filePath}.${randomUUID()}.tmp`;

    try {
      await writeFile(tempPath, buffer);
      await rename(tempPath, filePath);
    } catch {
      await unlink(tempPath).catch(() => {});
      throw new InternalServerErrorException(
        'Failed to write guest list CSV to storage',
      );
    }

    return { objectKey };
  }

  async delete(objectKey: string): Promise<void> {
    await unlink(this.resolveObjectPath(objectKey)).catch(() => {});
  }

  buildObjectKey(concertId: string, checksum: string): string {
    return `${concertId}-${checksum}.csv`;
  }

  private resolveObjectPath(objectKey: string): string {
    if (!objectKeyPattern.test(objectKey)) {
      throw new BadRequestException('Invalid guest list object key');
    }
    return join(this.storageDir, objectKey);
  }
}
