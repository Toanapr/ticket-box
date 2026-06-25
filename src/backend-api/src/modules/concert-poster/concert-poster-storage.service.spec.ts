import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ConcertPosterStorageService } from './concert-poster-storage.service';

const testDir = resolve('storage/__test__concert-posters');
const concertId = '11111111-1111-4111-8111-111111111111';
const uniqueToken = '22222222-2222-4222-8222-222222222222';

function makePngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

describe('ConcertPosterStorageService', () => {
  let service: ConcertPosterStorageService;

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    process.env.CONCERT_POSTER_STORAGE_DIR = testDir;
    service = new ConcertPosterStorageService();
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('onModuleInit', () => {
    it('creates the storage directory if missing', async () => {
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('buildObjectKey', () => {
    it('generates a deterministic key with version', () => {
      const key = service.buildObjectKey(concertId, 1, 'png', uniqueToken);
      expect(key).toBe(`${concertId}-1-${uniqueToken}.png`);
    });
  });

  describe('save', () => {
    it('writes a file and returns the object key', async () => {
      const { objectKey } = await service.save(
        concertId,
        'image/png',
        makePngBuffer(),
        1,
      );

      expect(objectKey).toMatch(
        new RegExp(`^${concertId}-1-[0-9a-f-]{36}\\.png$`),
      );

      const filePath = join(testDir, objectKey);
      const stored = readFileSync(filePath);
      expect(stored).toEqual(makePngBuffer());
    });

    it('uses distinct paths for concurrent uploads of the same version', async () => {
      const [first, second] = await Promise.all([
        service.save(concertId, 'image/png', makePngBuffer(), 7),
        service.save(concertId, 'image/png', makePngBuffer(), 7),
      ]);

      expect(first.objectKey).not.toBe(second.objectKey);
      expect(readFileSync(join(testDir, first.objectKey))).toEqual(
        makePngBuffer(),
      );
      expect(readFileSync(join(testDir, second.objectKey))).toEqual(
        makePngBuffer(),
      );
    });

    it('rejects oversized files', async () => {
      const oversized = Buffer.alloc(6 * 1024 * 1024);

      await expect(
        service.save(concertId, 'image/png', oversized, 1),
      ).rejects.toThrow(/5 MB/);
    });

    it('rejects invalid MIME', async () => {
      await expect(
        service.save(concertId, 'image/svg+xml', makePngBuffer(), 1),
      ).rejects.toThrow('Unsupported MIME type');
    });

    it('rejects invalid signature', async () => {
      const invalidBuffer = Buffer.from([
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
        0x0c,
      ]);
      await expect(
        service.save(concertId, 'image/jpeg', invalidBuffer, 1),
      ).rejects.toThrow('Invalid image signature');
    });

    it('rejects a reported MIME that does not match the image bytes', async () => {
      await expect(
        service.save(concertId, 'image/jpeg', makePngBuffer(), 1),
      ).rejects.toThrow('does not match');
    });
  });

  describe('delete', () => {
    it('deletes an existing file', async () => {
      const { objectKey } = await service.save(
        concertId,
        'image/png',
        makePngBuffer(),
        1,
      );

      await service.delete(objectKey);

      const filePath = join(testDir, objectKey);
      expect(() => readFileSync(filePath)).toThrow();
    });

    it('does not throw when deleting a missing file', async () => {
      await expect(
        service.delete(`${concertId}-999.png`),
      ).resolves.toBeUndefined();
    });

    it('rejects unsafe object keys', async () => {
      await expect(service.delete('../outside.png')).rejects.toThrow(
        'Invalid poster object key',
      );
    });
  });

  describe('read', () => {
    it('reads a stored file', async () => {
      const buffer = makePngBuffer();
      const { objectKey } = await service.save(
        concertId,
        'image/png',
        buffer,
        1,
      );
      const stored = await service.read(objectKey);
      expect(stored).toEqual(buffer);
    });
  });

  describe('parseVersion', () => {
    it('extracts version from object key', () => {
      expect(service.parseVersion(`${concertId}-3.jpg`)).toBe(3);
      expect(service.parseVersion(`${concertId}-4-${uniqueToken}.webp`)).toBe(
        4,
      );
    });

    it('returns null for invalid key', () => {
      expect(service.parseVersion('invalid')).toBeNull();
    });
  });
});
