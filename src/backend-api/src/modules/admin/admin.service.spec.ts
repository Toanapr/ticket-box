import { Prisma } from '@prisma/client';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { ConcertPosterStorageService } from '../concert-poster/concert-poster-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AdminService } from './admin.service';

const mockPosterStorage = {
  save: jest.fn(),
  delete: jest.fn(),
  parseVersion: jest.fn(),
  buildObjectKey: jest.fn(),
  getStorageDir: jest.fn(),
  onModuleInit: jest.fn(),
  read: jest.fn(),
  fileExists: jest.fn(),
} as unknown as ConcertPosterStorageService;

const organizer: CurrentUser = {
  sub: 'organizer-id',
  email: 'organizer@example.com',
  role: 'organizer',
  organizationId: 'organization-id',
  iss: 'test',
  iat: 1,
  exp: 2,
};

const concertBody = {
  title: 'Ðêm Nh?c Mùa Hè',
  venue: 'Test Venue',
  artistName: 'Test Artist',
  startAt: '2027-01-01T12:00:00.000Z',
  seatingMapObjectKey: 'maps/test.svg',
  publishedArtistBio: 'Test bio',
};

const ticketTypeBody = {
  zoneCode: 'VIP',
  name: 'Vé VIP',
  price: 1_800_000,
  capacity: 100,
  perUserLimit: 4,
  saleStartAt: '2026-07-01T03:00:00.000Z',
  saleEndAt: '2026-12-19T16:59:00.000Z',
};

describe('AdminService concert slugs', () => {
  const invalidateConcert = jest.fn();
  const create =
    jest.fn<
      (args: {
        data: Prisma.ConcertUncheckedCreateInput;
      }) => Promise<{ id: string; slug: string }>
    >();
  const findUnique = jest.fn();
  const update = jest.fn();
  const service = new AdminService(
    { invalidateConcert } as unknown as CacheInvalidationService,
    mockPosterStorage,
    {
      concert: { create, findUnique, update },
    } as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retries a conflicting slug with a numeric suffix', async () => {
    const attemptedSlugs: string[] = [];
    create
      .mockImplementationOnce(
        (args: { data: Prisma.ConcertUncheckedCreateInput }) => {
          attemptedSlugs.push(args.data.slug);
          return Promise.reject(
            new Prisma.PrismaClientKnownRequestError(
              'Unique constraint failed',
              {
                code: 'P2002',
                clientVersion: 'test',
                meta: { target: ['slug'] },
              },
            ),
          );
        },
      )
      .mockImplementationOnce(
        (args: { data: Prisma.ConcertUncheckedCreateInput }) => {
          attemptedSlugs.push(args.data.slug);
          return Promise.resolve({
            id: 'concert-id',
            slug: args.data.slug,
          });
        },
      );

    const result = await service.createConcert(organizer, concertBody);

    expect(attemptedSlugs).toHaveLength(2);
    expect(attemptedSlugs[1]).toBe(`${attemptedSlugs[0]}-2`);
    expect(result).toMatchObject({
      slug: attemptedSlugs[1],
    });
  });

  it('does not change the slug when the concert title changes', async () => {
    findUnique.mockResolvedValue({
      id: 'concert-id',
      organizationId: organizer.organizationId,
      slug: 'original-title',
    });
    update.mockResolvedValue({
      id: 'concert-id',
      slug: 'original-title',
      title: 'New Title',
    });

    await service.updateConcert(organizer, 'concert-id', {
      title: 'New Title',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'concert-id' },
      data: { title: 'New Title' },
    });
  });
});

describe('AdminService concert deletion', () => {
  const invalidateConcert = jest.fn();
  const findUnique = jest.fn();
  const deleteConcert = jest.fn();
  const posterStorage = {
    ...mockPosterStorage,
    delete: jest.fn(),
  } as unknown as ConcertPosterStorageService;
  const service = new AdminService(
    { invalidateConcert } as unknown as CacheInvalidationService,
    posterStorage,
    {
      concert: { findUnique, delete: deleteConcert },
    } as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({
      id: 'concert-id',
      organizationId: organizer.organizationId,
      posterObjectKey: 'concert-id-1-poster.png',
    });
    deleteConcert.mockResolvedValue({ id: 'concert-id' });
    (posterStorage.delete as jest.Mock).mockResolvedValue(undefined);
  });

  it('deletes an owned concert and schedules poster cleanup', async () => {
    await expect(service.deleteConcert(organizer, 'concert-id')).resolves.toEqual(
      { id: 'concert-id' },
    );

    expect(deleteConcert).toHaveBeenCalledWith({
      where: { id: 'concert-id' },
    });
    expect(invalidateConcert).toHaveBeenCalledWith('concert-id');
    expect((posterStorage.delete as jest.Mock)).toHaveBeenCalledWith(
      'concert-id-1-poster.png',
    );
  });

  it('returns a conflict when dependent data blocks deletion', async () => {
    deleteConcert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.deleteConcert(organizer, 'concert-id'),
    ).rejects.toThrow('dependent sales, orders, tickets, or guest list data');

    expect(invalidateConcert).not.toHaveBeenCalled();
    expect((posterStorage.delete as jest.Mock)).not.toHaveBeenCalled();
  });
});

describe('AdminService ticket type slugs', () => {
  const invalidateTicketType = jest.fn();
  const concertFindUnique = jest.fn();
  const ticketTypeFindUnique = jest.fn();
  const attemptedSlugs: string[] = [];
  const updatePayloads: Prisma.TicketTypeUpdateArgs['data'][] = [];
  let createAttempt = 0;

  const transactionClient = {
    ticketType: {
      create: jest.fn(
        (args: { data: Prisma.TicketTypeUncheckedCreateInput }) => {
          attemptedSlugs.push(args.data.slug);
          createAttempt += 1;
          if (createAttempt === 1) {
            return Promise.reject(
              new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                {
                  code: 'P2002',
                  clientVersion: 'test',
                  meta: { target: ['concert_id', 'slug'] },
                },
              ),
            );
          }
          return Promise.resolve({
            id: 'ticket-type-id',
            concertId: 'concert-id',
            slug: args.data.slug,
          });
        },
      ),
      update: jest.fn((args: Prisma.TicketTypeUpdateArgs) => {
        updatePayloads.push(args.data);
        return Promise.resolve({
          id: 'ticket-type-id',
          concertId: 'concert-id',
          slug: 've-vip',
          name: 'New VIP Name',
        });
      }),
    },
    inventoryCounter: {
      create: jest.fn(() =>
        Promise.resolve({ ticketTypeId: 'ticket-type-id' }),
      ),
    },
  };
  const transaction = jest.fn(
    (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      callback(transactionClient as unknown as Prisma.TransactionClient),
  );
  const service = new AdminService(
    { invalidateTicketType } as unknown as CacheInvalidationService,
    mockPosterStorage,
    {
      concert: { findUnique: concertFindUnique },
      ticketType: { findUnique: ticketTypeFindUnique },
      $transaction: transaction,
    } as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    attemptedSlugs.length = 0;
    updatePayloads.length = 0;
    createAttempt = 0;
    concertFindUnique.mockResolvedValue({
      id: 'concert-id',
      organizationId: organizer.organizationId,
    });
  });

  it('retries a conflicting slug within the concert', async () => {
    const result = await service.createTicketType(
      organizer,
      'concert-id',
      ticketTypeBody,
    );

    expect(attemptedSlugs).toHaveLength(2);
    expect(attemptedSlugs[1]).toBe(`${attemptedSlugs[0]}-2`);
    expect(result).toMatchObject({ slug: attemptedSlugs[1] });
  });

  it('does not change the slug when the ticket type name changes', async () => {
    ticketTypeFindUnique.mockResolvedValue({
      id: 'ticket-type-id',
      concertId: 'concert-id',
      slug: 've-vip',
      name: 'Vé VIP',
      saleStartAt: new Date('2027-07-01T03:00:00.000Z'),
      saleEndAt: new Date('2027-12-19T16:59:00.000Z'),
      inventory: null,
      concert: { organizationId: organizer.organizationId },
    });

    await service.updateTicketType(organizer, 'ticket-type-id', {
      name: 'New VIP Name',
    });

    expect(updatePayloads).toEqual([
      {
        zoneCode: undefined,
        name: 'New VIP Name',
        price: undefined,
        capacity: undefined,
        perUserLimit: undefined,
        saleStartAt: undefined,
        saleEndAt: undefined,
      },
    ]);
  });
});

describe('AdminService concert posters', () => {
  const concertId = '11111111-1111-4111-8111-111111111111';
  const oldKey = `${concertId}-1.png`;
  const newKey = `${concertId}-2-22222222-2222-4222-8222-222222222222.png`;
  const findUnique = jest.fn();
  const update = jest.fn();
  const updateMany = jest.fn();
  const invalidateConcert = jest.fn();
  const posterStorage = {
    save: jest.fn(),
    delete: jest.fn(),
    parseVersion: jest.fn(),
    fileExists: jest.fn(),
  };
  const service = new AdminService(
    { invalidateConcert } as unknown as CacheInvalidationService,
    posterStorage as unknown as ConcertPosterStorageService,
    {
      concert: { findUnique, update, updateMany },
    } as unknown as PrismaService,
  );
  const posterFile = {
    mimetype: 'image/png',
    buffer: Buffer.from('poster-bytes'),
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({
      id: concertId,
      organizationId: organizer.organizationId,
      posterObjectKey: oldKey,
    });
    posterStorage.parseVersion.mockReturnValue(1);
    posterStorage.save.mockResolvedValue({ objectKey: newKey });
    posterStorage.delete.mockResolvedValue(undefined);
    posterStorage.fileExists.mockResolvedValue(true);
    updateMany.mockResolvedValue({ count: 1 });
  });

  it('replaces the poster with a compare-and-swap update', async () => {
    await expect(
      service.uploadPoster(organizer, concertId, posterFile),
    ).resolves.toEqual({ posterObjectKey: newKey });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: concertId, posterObjectKey: oldKey },
      data: { posterObjectKey: newKey },
    });
    expect(invalidateConcert).toHaveBeenCalledWith(concertId);
    expect(posterStorage.delete).toHaveBeenCalledWith(oldKey);
  });

  it('deletes the losing file and returns conflict when CAS loses', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.uploadPoster(organizer, concertId, posterFile),
    ).rejects.toThrow('replaced by another request');

    expect(posterStorage.delete).toHaveBeenCalledWith(newKey);
    expect(invalidateConcert).not.toHaveBeenCalled();
  });

  it('compensates the saved file when the database update fails', async () => {
    updateMany.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.uploadPoster(organizer, concertId, posterFile),
    ).rejects.toThrow('after saving file');

    expect(posterStorage.delete).toHaveBeenCalledWith(newKey);
    expect(invalidateConcert).not.toHaveBeenCalled();
  });

  it('checks ownership before writing poster bytes', async () => {
    findUnique.mockResolvedValue({
      id: concertId,
      organizationId: 'another-organization',
      posterObjectKey: oldKey,
    });

    await expect(
      service.uploadPoster(organizer, concertId, posterFile),
    ).rejects.toThrow('another organization');

    expect(posterStorage.save).not.toHaveBeenCalled();
  });

  it('rejects publishing when the referenced poster file is missing', async () => {
    posterStorage.fileExists.mockResolvedValue(false);

    await expect(
      service.updateConcert(organizer, concertId, { status: 'published' }),
    ).rejects.toThrow('without a stored poster');

    expect(update).not.toHaveBeenCalled();
  });

  it('publishes when the referenced poster file exists', async () => {
    update.mockResolvedValue({ id: concertId, status: 'published' });

    await expect(
      service.updateConcert(organizer, concertId, { status: 'published' }),
    ).resolves.toMatchObject({ status: 'published' });

    expect(posterStorage.fileExists).toHaveBeenCalledWith(oldKey);
    expect(update).toHaveBeenCalledWith({
      where: { id: concertId },
      data: { status: 'published' },
    });
  });
});
