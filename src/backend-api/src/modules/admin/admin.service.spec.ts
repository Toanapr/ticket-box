import { Prisma } from '@prisma/client';
import { CacheInvalidationService } from '../../common/cache/cache-invalidation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AdminService } from './admin.service';

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
  title: 'Đêm Nhạc Mùa Hè',
  venue: 'Test Venue',
  artistName: 'Test Artist',
  startAt: '2027-01-01T12:00:00.000Z',
  seatingMapObjectKey: 'maps/test.svg',
  publishedArtistBio: 'Test bio',
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
            slug: 'dem-nhac-mua-he-2',
          });
        },
      );

    await expect(
      service.createConcert(organizer, concertBody),
    ).resolves.toMatchObject({
      slug: 'dem-nhac-mua-he-2',
    });
    expect(attemptedSlugs).toEqual(['dem-nhac-mua-he', 'dem-nhac-mua-he-2']);
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
