import { BadRequestException } from '@nestjs/common';
import { ArtistBioService } from './artist-bio.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';
import { ArtistBioQueueService } from './artist-bio-queue.service';
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

function pdfFile(body = 'Artist biography with enough source text for generation.') {
  const pdf = `%PDF-1.4
1 0 obj
<< /Length 80 >>
stream
BT
(${body}) Tj
ET
endstream
endobj
%%EOF`;

  return {
    fieldname: 'file',
    originalname: 'artist-bio.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: Buffer.byteLength(pdf),
    buffer: Buffer.from(pdf),
  } as Express.Multer.File;
}

describe('ArtistBioService', () => {
  const concertFindUnique = jest.fn();
  const artistBioJobFindUnique = jest.fn();
  const artistBioJobCreate = jest.fn();
  const artistBioJobFindMany = jest.fn();
  const artistBioJobUpdate = jest.fn();

  const prisma = {
    concert: { findUnique: concertFindUnique },
    artistBioJob: {
      findUnique: artistBioJobFindUnique,
      create: artistBioJobCreate,
      findMany: artistBioJobFindMany,
      update: artistBioJobUpdate,
    },
  } as unknown as PrismaService;

  const storage = {
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ArtistBioStorageService>;

  const queue = {
    publish: jest.fn(),
  } as unknown as jest.Mocked<ArtistBioQueueService>;

  const service = new ArtistBioService(prisma, storage, queue);

  beforeEach(() => {
    jest.clearAllMocks();
    concertFindUnique.mockResolvedValue({
      id: concertId,
      organizationId: organizer.organizationId,
      artistName: 'Summer Live Artist',
    });
    artistBioJobFindUnique.mockResolvedValue(null);
    artistBioJobCreate.mockImplementation((args: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'job-id',
        concertId,
        status: args.data.status,
        fileChecksum: args.data.fileChecksum,
        pipelineVersion: args.data.pipelineVersion,
      }),
    );
    artistBioJobFindMany.mockResolvedValue([]);
    artistBioJobUpdate.mockResolvedValue({
      id: 'job-id',
      status: 'queued',
      draft: null,
    });
    storage.save.mockResolvedValue({ objectKey: 'raw-object-key.pdf' });
    storage.delete.mockResolvedValue(undefined);
    queue.publish.mockResolvedValue(undefined);
  });

  it('returns the existing job for an idempotent re-upload', async () => {
    artistBioJobFindUnique.mockResolvedValue({
      id: 'existing-job-id',
      status: 'draft_ready',
      draft: { id: 'draft-id' },
    });

    await expect(service.createJob(organizer, concertId, pdfFile())).resolves.toMatchObject({
      id: 'existing-job-id',
      idempotent: true,
    });

    expect(storage.save).not.toHaveBeenCalled();
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('surfaces invalid PDF validation failures from storage', async () => {
    storage.save.mockRejectedValue(
      new BadRequestException('Uploaded file is not a valid PDF document'),
    );

    await expect(
      service.createJob(organizer, concertId, {
        ...pdfFile(),
        buffer: Buffer.from('not-a-pdf'),
      }),
    ).rejects.toThrow('Uploaded file is not a valid PDF document');

    expect(artistBioJobCreate).not.toHaveBeenCalled();
  });

  it('resets a failed job for manual retry with the same job id', async () => {
    artistBioJobFindUnique.mockResolvedValue({
      id: 'job-id',
      concert: { organizationId: organizer.organizationId },
      draft: null,
      status: 'failed',
    });

    await expect(service.retryJob(organizer, 'job-id')).resolves.toMatchObject({
      id: 'job-id',
      status: 'queued',
    });

    expect(artistBioJobUpdate).toHaveBeenCalledWith({
      where: { id: 'job-id' },
      data: expect.objectContaining({
        status: 'queued',
        attemptCount: 0,
      }),
      include: { draft: true },
    });
    expect(queue.publish).toHaveBeenCalledWith('job-id');
  });
});
