import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ArtistBioJob, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUser } from '../auth/current-user';
import {
  ARTIST_BIO_MAX_ATTEMPTS,
  ARTIST_BIO_PIPELINE_VERSION,
} from './artist-bio.constants';
import { ArtistBioQueueService } from './artist-bio-queue.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';

@Injectable()
export class ArtistBioService {
  private readonly logger = new Logger(ArtistBioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ArtistBioStorageService,
    private readonly queue: ArtistBioQueueService,
  ) {}

  async createJob(
    user: CurrentUser,
    concertId: string,
    file: Express.Multer.File,
  ) {
    try {
      const concert = await this.findOwnedConcert(user, concertId);

      if (!file.buffer || file.buffer.length === 0) {
        throw new BadRequestException('Artist bio PDF is required');
      }

      const checksum = createHash('sha256').update(file.buffer).digest('hex');
      const existing = await this.prisma.artistBioJob.findUnique({
        where: {
          concertId_fileChecksum_pipelineVersion: {
            concertId,
            fileChecksum: checksum,
            pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
          },
        },
        include: { draft: true },
      });

      if (existing) {
        return { ...existing, idempotent: true };
      }

      const { objectKey } = await this.storage.save(
        concertId,
        checksum,
        file.mimetype,
        file.buffer,
      );

      let job: ArtistBioJob;
      try {
        job = await this.prisma.artistBioJob.create({
          data: {
            concertId,
            fileChecksum: checksum,
            pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
            rawObjectKey: objectKey,
            originalName: file.originalname,
            sourceMimeType: file.mimetype,
            status: 'queued',
            attemptCount: 0,
            maxAttempts: ARTIST_BIO_MAX_ATTEMPTS,
            nextAttemptAt: new Date(),
          },
        });
      } catch (error) {
        await this.storage.delete(objectKey);
        throw error;
      }

      await this.queue.publish(job.id);
      this.logger.log(
        formatStructuredLog('artist_bio_job_created', {
          artistBioJobId: job.id,
          concertId: concert.id,
        }),
      );

      return {
        ...job,
        draft: null,
        idempotent: false,
      };
    } catch (error) {
      if (isArtistBioSchemaError(error)) {
        throw new ServiceUnavailableException(
          'Artist bio database schema is not ready. Run the latest backend migrations and try again.',
        );
      }
      throw error;
    }
  }

  async listJobs(user: CurrentUser, concertId: string) {
    await this.findOwnedConcert(user, concertId);

    try {
      return this.prisma.artistBioJob.findMany({
        where: { concertId },
        include: { draft: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (error) {
      if (isArtistBioSchemaError(error)) {
        throw new ServiceUnavailableException(
          'Artist bio database schema is not ready. Run the latest backend migrations and try again.',
        );
      }
      throw error;
    }
  }

  async retryJob(user: CurrentUser, jobId: string) {
    const job = await this.prisma.artistBioJob.findUnique({
      where: { id: jobId },
      include: { concert: true, draft: true },
    });

    if (!job) {
      throw new NotFoundException('Artist bio job not found');
    }

    this.assertOrganizerOwnsConcert(user, job.concert.organizationId);

    if (job.status !== 'failed') {
      throw new BadRequestException('Only failed artist bio jobs can be retried');
    }

    const updated = await this.prisma.artistBioJob.update({
      where: { id: job.id },
      data: {
        status: 'queued',
        attemptCount: 0,
        nextAttemptAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        completedAt: null,
        lastError: null,
        lastErrorAt: null,
        startedAt: null,
      },
      include: { draft: true },
    });

    await this.queue.publish(updated.id);
    return updated;
  }

  async findJobForProcessing(jobId: string) {
    return this.prisma.artistBioJob.findUnique({
      where: { id: jobId },
      include: { concert: true, draft: true },
    });
  }

  async claimNextJob(leaseMs: number) {
    const now = new Date();
    const candidate = await this.prisma.artistBioJob.findFirst({
      where: {
        status: 'queued',
        nextAttemptAt: { lte: now },
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!candidate) {
      return null;
    }

    const leaseOwner = randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + leaseMs);
    const claimed = await this.prisma.artistBioJob.updateMany({
      where: {
        id: candidate.id,
        status: 'queued',
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
      },
      data: {
        status: 'processing',
        attemptCount: { increment: 1 },
        startedAt: now,
        leaseOwner,
        leaseExpiresAt,
      },
    });

    if (claimed.count !== 1) {
      return null;
    }

    return this.prisma.artistBioJob.findUnique({
      where: { id: candidate.id },
      include: { concert: true, draft: true },
    });
  }

  async markDraftReady(
    jobId: string,
    draftContent: string,
    metadata: {
      extractedText: string;
      sanitizedText: string;
      providerVersion: string;
      modelVersion: string;
      promptVersion: string;
    },
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.artistBioJob.update({
        where: { id: jobId },
        data: {
          status: 'draft_ready',
          completedAt: new Date(),
          leaseOwner: null,
          leaseExpiresAt: null,
          lastError: null,
          lastErrorAt: null,
          extractedText: metadata.extractedText,
          sanitizedText: metadata.sanitizedText,
          providerVersion: metadata.providerVersion,
          modelVersion: metadata.modelVersion,
          promptVersion: metadata.promptVersion,
        },
      });

      await tx.artistBioDraft.upsert({
        where: { jobId },
        create: {
          concertId: (
            await tx.artistBioJob.findUniqueOrThrow({
              where: { id: jobId },
              select: { concertId: true },
            })
          ).concertId,
          jobId,
          content: draftContent,
          reviewStatus: 'pending_review',
          providerVersion: metadata.providerVersion,
          modelVersion: metadata.modelVersion,
          promptVersion: metadata.promptVersion,
        },
        update: {
          content: draftContent,
          reviewStatus: 'pending_review',
          providerVersion: metadata.providerVersion,
          modelVersion: metadata.modelVersion,
          promptVersion: metadata.promptVersion,
        },
      });
    });
  }

  async rescheduleFailedAttempt(job: ArtistBioJob, errorMessage: string) {
    const now = new Date();
    const exhausted = job.attemptCount >= job.maxAttempts;
    const nextAttemptAt = exhausted
      ? job.nextAttemptAt
      : new Date(now.getTime() + this.backoffMs(job.attemptCount));

    return this.prisma.artistBioJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? 'failed' : 'queued',
        nextAttemptAt,
        leaseOwner: null,
        leaseExpiresAt: null,
        completedAt: exhausted ? now : null,
        lastError: errorMessage,
        lastErrorAt: now,
      },
      include: { draft: true },
    });
  }

  private backoffMs(attemptCount: number): number {
    const base = Math.min(30_000, 2 ** Math.max(attemptCount - 1, 0) * 5_000);
    return base + Math.floor(base * 0.1);
  }

  private async findOwnedConcert(user: CurrentUser, concertId: string) {
    const concert = await this.prisma.concert.findUnique({ where: { id: concertId } });
    if (!concert) {
      throw new NotFoundException('Concert not found');
    }
    this.assertOrganizerOwnsConcert(user, concert.organizationId);
    return concert;
  }

  private assertOrganizerOwnsConcert(user: CurrentUser, organizationId: string) {
    if (!user.organizationId) {
      throw new ForbiddenException('Organizer must belong to an organization');
    }
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Concert belongs to another organization');
    }
  }
}

function isArtistBioSchemaError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  );
}
