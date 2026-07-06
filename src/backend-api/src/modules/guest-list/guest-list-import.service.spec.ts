import { Prisma } from '@prisma/client';
import { GuestListImportService } from './guest-list-import.service';
import { GuestListStorageService } from './guest-list-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';

const organizer: CurrentUser = {
  sub: 'organizer-id',
  email: 'organizer@example.com',
  role: 'organizer',
  organizationId: 'organization-id',
  iss: 'test',
  iat: 1,
  exp: 2,
};

const concertId = '11111111-1111-4111-8111-111111111111';
const ticketTypeId = '22222222-2222-4222-8222-222222222222';

function csvFile(csv: string): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'guest-list.csv',
    encoding: '7bit',
    mimetype: 'text/csv',
    size: Buffer.byteLength(csv),
    buffer: Buffer.from(csv),
  } as Express.Multer.File;
}

describe('GuestListImportService', () => {
  const storage = {
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<GuestListStorageService>;

  const concertFindUnique = jest.fn();
  const batchFindUnique = jest.fn();
  const batchCreate = jest.fn();
  const ticketTypeFindMany = jest.fn();
  const activeVersionFindFirst = jest.fn();
  const txBatchCreate = jest.fn();
  const txBatchUpdate = jest.fn();
  const txStagingCreateMany = jest.fn();
  const txVersionFindFirst = jest.fn();
  const txVersionUpdateMany = jest.fn();
  const txVersionCreate = jest.fn();
  const txEntryCreateMany = jest.fn();
  const txOutboxCreate = jest.fn();
  const transaction = jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      guestListBatch: { create: txBatchCreate, update: txBatchUpdate },
      guestEntryStaging: { createMany: txStagingCreateMany },
      guestListVersion: {
        findFirst: txVersionFindFirst,
        updateMany: txVersionUpdateMany,
        create: txVersionCreate,
      },
      guestEntry: { createMany: txEntryCreateMany },
      guestListOutbox: { create: txOutboxCreate },
    }),
  );

  const prisma = {
    concert: { findUnique: concertFindUnique },
    guestListBatch: { findUnique: batchFindUnique, create: batchCreate },
    ticketType: { findMany: ticketTypeFindMany },
    guestListVersion: { findFirst: activeVersionFindFirst },
    $transaction: transaction,
  } as unknown as PrismaService;

  const service = new GuestListImportService(prisma, storage);

  beforeEach(() => {
    jest.clearAllMocks();
    concertFindUnique.mockResolvedValue({
      id: concertId,
      organizationId: organizer.organizationId,
    });
    batchFindUnique.mockResolvedValue(null);
    batchCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'batch-id',
        concertId,
        status: args.data.status,
        summary: args.data.summary,
      }),
    );
    ticketTypeFindMany.mockResolvedValue([
      { id: ticketTypeId, slug: 'vip', zoneCode: 'VIP' },
    ]);
    activeVersionFindFirst.mockResolvedValue(null);
    storage.save.mockResolvedValue({ objectKey: 'raw-key.csv' });
    storage.delete.mockResolvedValue(undefined);
    txBatchCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'batch-id',
        concertId,
        status: args.data.status,
        summary: args.data.summary,
      }),
    );
    txVersionFindFirst.mockResolvedValue(null);
    txVersionUpdateMany.mockResolvedValue({ count: 0 });
    txVersionCreate.mockResolvedValue({
      id: 'version-id',
      versionNo: 1,
      entryCount: 1,
    });
    txBatchUpdate.mockResolvedValue({ id: 'batch-id', status: 'published' });
    txStagingCreateMany.mockResolvedValue({ count: 1 });
    txEntryCreateMany.mockResolvedValue({ count: 1 });
    txOutboxCreate.mockResolvedValue({ id: 'outbox-id' });
  });

  it('publishes a valid guest list as a new active version', async () => {
    const result = await service.importCsv(
      organizer,
      concertId,
      csvFile('full_name,email,zone_code\nJane Guest,jane@example.com,VIP\n'),
    );

    expect(result).toMatchObject({ status: 'published', idempotent: false });
    expect(txVersionUpdateMany).toHaveBeenCalledWith({
      where: { concertId, isActive: true },
      data: { isActive: false },
    });
    expect(txEntryCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          versionId: 'version-id',
          ticketTypeId,
          fullName: 'Jane Guest',
          identityKey: 'email:jane@example.com',
          zoneCode: 'VIP',
        }),
      ],
    });
    expect(txOutboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: 'GuestListUpdated' }),
    });
  });

  it('stages invalid duplicate rows without publishing a version', async () => {
    const result = await service.importCsv(
      organizer,
      concertId,
      csvFile(
        'full_name,email,zone_code\nJane Guest,jane@example.com,VIP\nJane Guest,jane@example.com,VIP\n',
      ),
    );

    expect(result).toMatchObject({ status: 'validation_failed' });
    expect(txVersionCreate).not.toHaveBeenCalled();
    expect(txOutboxCreate).not.toHaveBeenCalled();
    expect(txStagingCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ status: 'invalid' }),
      ]),
    });
  });

  it('records file-level CSV errors as failed batches without publishing', async () => {
    const result = await service.importCsv(
      organizer,
      concertId,
      csvFile('full_name,zone_code\nJane Guest,VIP\n'),
    );

    expect(result).toMatchObject({ status: 'failed', idempotent: false });
    expect(storage.save).toHaveBeenCalled();
    expect(ticketTypeFindMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(txVersionCreate).not.toHaveBeenCalled();
    expect(batchCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'failed',
        summary: expect.objectContaining({
          errorReason: expect.stringContaining('CSV must include one of'),
        }),
      }),
    });
  });

  it('requires at least one ticket type before importing a guest list', async () => {
    ticketTypeFindMany.mockResolvedValue([]);

    await expect(
      service.importCsv(
        organizer,
        concertId,
        csvFile('full_name,email,zone_code\nJane Guest,jane@example.com,VIP\n'),
      ),
    ).rejects.toThrow('at least one ticket type before importing a guest list');

    expect(transaction).not.toHaveBeenCalled();
  });

  it('returns a schema-ready message when guest list tables are missing', async () => {
    batchFindUnique.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('table missing', {
        code: 'P2021',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.importCsv(
        organizer,
        concertId,
        csvFile('full_name,email,zone_code\nJane Guest,jane@example.com,VIP\n'),
      ),
    ).rejects.toThrow('Run the latest backend migrations');
  });

  it('returns an existing batch for idempotent re-upload', async () => {
    batchFindUnique.mockResolvedValue({
      id: 'existing-batch-id',
      status: 'published',
      version: { id: 'version-id' },
    });

    await expect(
      service.importCsv(
        organizer,
        concertId,
        csvFile('full_name,email,zone_code\nJane Guest,jane@example.com,VIP\n'),
      ),
    ).resolves.toMatchObject({ id: 'existing-batch-id', idempotent: true });

    expect(storage.save).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
