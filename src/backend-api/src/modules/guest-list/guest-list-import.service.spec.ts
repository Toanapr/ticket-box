import { Prisma } from '@prisma/client';
import { GuestListEmailService } from './guest-list-email.service';
import { GuestListImportService, GUEST_LIST_DEFAULT_ZONE } from './guest-list-import.service';
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
  const guestListEmailService = {
    sendPublishedGuestInvitations: jest.fn(),
  } as unknown as jest.Mocked<GuestListEmailService>;

  const concertFindUnique = jest.fn();
  const batchFindUnique = jest.fn();
  const batchCreate = jest.fn();
  const activeVersionFindFirst = jest.fn();
  const txBatchCreate = jest.fn();
  const txBatchUpdate = jest.fn();
  const txStagingCreateMany = jest.fn();
  const txVersionFindFirst = jest.fn();
  const txVersionUpdateMany = jest.fn();
  const txVersionCreate = jest.fn();
  const txVersionDelete = jest.fn();
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
        delete: txVersionDelete,
      },
      guestEntry: { createMany: txEntryCreateMany },
      guestListOutbox: { create: txOutboxCreate },
    }),
  );

  const prisma = {
    concert: { findUnique: concertFindUnique },
    guestListBatch: { findUnique: batchFindUnique, create: batchCreate },
    guestListVersion: { findFirst: activeVersionFindFirst },
    $transaction: transaction,
  } as unknown as PrismaService;

  const service = new GuestListImportService(
    prisma,
    storage,
    guestListEmailService,
  );

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
    txVersionDelete.mockResolvedValue({ id: 'version-id' });
    txBatchUpdate.mockResolvedValue({ id: 'batch-id', status: 'published' });
    txStagingCreateMany.mockResolvedValue({ count: 1 });
    txEntryCreateMany.mockResolvedValue({ count: 1 });
    txOutboxCreate.mockResolvedValue({ id: 'outbox-id' });
    guestListEmailService.sendPublishedGuestInvitations.mockResolvedValue(1);
  });

  it('publishes a valid guest list into the default private guest area', async () => {
    const result = await service.importCsv(
      organizer,
      concertId,
      csvFile('full_name,email\nJane Guest,jane@example.com\n'),
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
          ticketTypeId: null,
          fullName: 'Jane Guest',
          identityKey: 'email:jane@example.com',
          zoneCode: GUEST_LIST_DEFAULT_ZONE,
        }),
      ],
    });
    expect(txOutboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: 'GuestListUpdated' }),
    });
    expect(guestListEmailService.sendPublishedGuestInvitations).toHaveBeenCalledWith(
      'version-id',
    );
  });

  it('stages invalid duplicate rows without publishing a version', async () => {
    const result = await service.importCsv(
      organizer,
      concertId,
      csvFile(
        'full_name,email\nJane Guest,jane@example.com\nJane Guest,jane@example.com\n',
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
      csvFile('full_name\nJane Guest\n'),
    );

    expect(result).toMatchObject({ status: 'failed', idempotent: false });
    expect(storage.save).toHaveBeenCalled();
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

  it('ignores legacy seating columns and still publishes to the private guest area', async () => {
    await expect(
      service.importCsv(
        organizer,
        concertId,
        csvFile(
          'full_name,email,zone_code,ticket_type_slug\nJane Guest,jane@example.com,VIP,vip\n',
        ),
      ),
    ).resolves.toMatchObject({ status: 'published' });

    expect(txEntryCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          fullName: 'Jane Guest',
          zoneCode: GUEST_LIST_DEFAULT_ZONE,
          ticketTypeId: null,
        }),
      ],
    });
  });

  it('lists active guest entries in the private guest area', async () => {
    activeVersionFindFirst.mockResolvedValue({
      id: 'version-id',
      versionNo: 3,
      entryCount: 1,
      publishedAt: new Date('2026-07-06T09:00:00.000Z'),
      entries: [
        {
          id: 'entry-1',
          fullName: 'VIP Guest',
          email: 'vip@example.com',
          phone: null,
          sponsorId: null,
          identityKey: 'email:vip@example.com',
          zoneCode: GUEST_LIST_DEFAULT_ZONE,
          ticketTypeId: null,
          ticketType: null,
        },
      ],
    });

    await expect(service.listActiveEntries(organizer, concertId)).resolves.toEqual({
      concertId,
      version: {
        id: 'version-id',
        versionNo: 3,
        entryCount: 1,
        publishedAt: new Date('2026-07-06T09:00:00.000Z'),
      },
      entries: [
        {
          id: 'entry-1',
          fullName: 'VIP Guest',
          email: 'vip@example.com',
          phone: null,
          sponsorId: null,
          identityKey: 'email:vip@example.com',
          zoneCode: GUEST_LIST_DEFAULT_ZONE,
          ticketTypeId: null,
          ticketTypeSlug: null,
          ticketTypeName: null,
        },
      ],
    });
  });

  it('deletes the active guest list while keeping import history intact', async () => {
    activeVersionFindFirst.mockResolvedValueOnce({
      id: 'version-id',
      versionNo: 4,
      checksum: 'checksum-123',
      entryCount: 5,
    });

    await expect(service.deleteActiveGuestList(organizer, concertId)).resolves.toEqual({
      concertId,
      deleted: true,
      clearedVersionId: 'version-id',
    });

    expect(txVersionDelete).toHaveBeenCalledWith({
      where: { id: 'version-id' },
    });
    expect(txOutboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: 'GuestListUpdated',
        aggregateId: concertId,
      }),
    });
  });

  it('returns deleted false when there is no active guest list to remove', async () => {
    activeVersionFindFirst.mockResolvedValueOnce(null);

    await expect(service.deleteActiveGuestList(organizer, concertId)).resolves.toEqual({
      concertId,
      deleted: false,
    });

    expect(txVersionDelete).not.toHaveBeenCalled();
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
        csvFile('full_name,email\nJane Guest,jane@example.com\n'),
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
        csvFile('full_name,email\nJane Guest,jane@example.com\n'),
      ),
    ).resolves.toMatchObject({ id: 'existing-batch-id', idempotent: true });

    expect(storage.save).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });
});
