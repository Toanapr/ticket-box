/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { Prisma } from '@prisma/client';
import { ArtistBioQueueService } from './artist-bio-queue.service';
import { ArtistBioService } from './artist-bio.service';
import { ARTIST_BIO_PIPELINE_VERSION } from './artist-bio-ai.adapter';
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

const pdfFile = {
  originalname: 'press-kit.pdf',
  mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n(Artist bio)\n%%EOF'),
} as Express.Multer.File;

describe('ArtistBioService', () => {
  const concertFindUnique = jest.fn();
  const jobCreate = jest.fn();
  const jobFindUnique = jest.fn();
  const jobFindUniqueOrThrow = jest.fn();
  const jobFindFirst = jest.fn();
  const jobUpdate = jest.fn();
  const storage = { save: jest.fn() };
  const queue = { publish: jest.fn() } as unknown as ArtistBioQueueService;

  const service = new ArtistBioService(
    {
      concert: { findUnique: concertFindUnique },
      artistBioJob: {
        create: jobCreate,
        findUnique: jobFindUnique,
        findUniqueOrThrow: jobFindUniqueOrThrow,
        findFirst: jobFindFirst,
        update: jobUpdate,
      },
    } as never,
    queue,
    storage as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    concertFindUnique.mockResolvedValue({
      id: 'concert-id',
      organizationId: organizer.organizationId,
    });
    storage.save.mockResolvedValue({
      objectKey: 'concert-id/checksum/v1-file.pdf',
      checksum: 'checksum',
    });
    jobFindUniqueOrThrow.mockResolvedValue({
      id: 'job-id',
      status: 'queued',
      draft: null,
    });
  });

  it('checks organization ownership before saving PDF bytes', async () => {
    concertFindUnique.mockResolvedValue({
      id: 'concert-id',
      organizationId: 'another-organization',
    });

    await expect(
      service.createJob(organizer, 'concert-id', pdfFile),
    ).rejects.toThrow('another organization');

    expect(storage.save).not.toHaveBeenCalled();
  });

  it('creates and publishes an idempotent job after persisting metadata', async () => {
    jobCreate.mockResolvedValue({
      id: 'job-id',
      pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
    });

    await service.createJob(organizer, 'concert-id', pdfFile);

    expect(jobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        concertId: 'concert-id',
        checksum: 'checksum',
        status: 'queued',
      }),
    });
    expect(queue.publish).toHaveBeenCalledWith({
      artistBioJobId: 'job-id',
      pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
    });
  });

  it('returns the existing job when the same PDF is uploaded again', async () => {
    jobCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await service.createJob(organizer, 'concert-id', pdfFile);

    expect(jobFindUniqueOrThrow).toHaveBeenCalledWith({
      where: {
        concertId_checksum_pipelineVersion: {
          concertId: 'concert-id',
          checksum: 'checksum',
          pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
        },
      },
    });
  });

  it('returns the latest job with its draft for the review flow', async () => {
    jobFindFirst.mockResolvedValue({
      id: 'latest-job',
      draft: { id: 'draft' },
    });

    await expect(
      service.getLatestJob(organizer, 'concert-id'),
    ).resolves.toEqual({
      id: 'latest-job',
      draft: { id: 'draft' },
    });
  });

  it('rejects manual retry for a non-failed job', async () => {
    jobFindUnique.mockResolvedValue({
      id: 'job-id',
      status: 'draft_ready',
      concert: { organizationId: organizer.organizationId },
    });

    await expect(service.retryJob(organizer, 'job-id')).rejects.toThrow(
      'Only failed',
    );
  });

  it('resets a failed job and republishes it for manual retry', async () => {
    jobFindUnique.mockResolvedValue({
      id: 'job-id',
      status: 'failed',
      concert: { organizationId: organizer.organizationId },
    });
    jobUpdate.mockResolvedValue({
      id: 'job-id',
      pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
    });

    await service.retryJob(organizer, 'job-id');

    expect(jobUpdate).toHaveBeenCalledWith({
      where: { id: 'job-id' },
      data: expect.objectContaining({
        status: 'queued',
        retryCount: 0,
        errorCode: null,
      }),
    });
    expect(queue.publish).toHaveBeenCalledWith({
      artistBioJobId: 'job-id',
      pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
    });
  });
});
