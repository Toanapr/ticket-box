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
import { requireArtistBioDraftContent } from './dto/artist-bio-review.dto';
import { normalizeArtistProfiles } from './artist-profile.util';
import { ArtistBioGenerationResult } from './artist-bio-ai.provider';

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

    if (job.status !== 'failed' && job.status !== 'draft_ready') {
      throw new BadRequestException(
        'Only failed or draft_ready artist bio jobs can be retried',
      );
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

  async getReviewState(user: CurrentUser, concertId: string) {
    const concert = await this.findOwnedConcert(user, concertId);
    const jobs = await this.prisma.artistBioJob.findMany({
      where: { concertId },
      include: { draft: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const latestDraft = jobs.find((job) => job.draft)?.draft ?? null;

    return {
      concertId,
      artistName: concert.artistName,
      publishedArtistBio: concert.publishedArtistBio,
      latestDraft,
      jobs,
    };
  }

  async updateDraft(
    user: CurrentUser,
    draftId: string,
    body: { content?: unknown },
  ) {
    const draft = await this.prisma.artistBioDraft.findUnique({
      where: { id: draftId },
      include: { concert: true },
    });

    if (!draft) {
      throw new NotFoundException('Artist bio draft not found');
    }

    this.assertOrganizerOwnsConcert(user, draft.concert.organizationId);
    const content = requireArtistBioDraftContent(body);

    return this.prisma.artistBioDraft.update({
      where: { id: draftId },
      data: { content },
    });
  }

  async publishDraft(user: CurrentUser, draftId: string) {
    const draft = await this.prisma.artistBioDraft.findUnique({
      where: { id: draftId },
      include: { concert: true, job: true },
    });

    if (!draft) {
      throw new NotFoundException('Artist bio draft not found');
    }

    this.assertOrganizerOwnsConcert(user, draft.concert.organizationId);

    const updatedConcert = await this.prisma.concert.update({
      where: { id: draft.concertId },
      data: {
        publishedArtistBio: draft.content,
        publishedArtistProfiles: toArtistProfilesJson(
          normalizeArtistProfiles(draft.artistProfiles),
        ),
      },
      select: {
        id: true,
        publishedArtistBio: true,
        publishedArtistProfiles: true,
      },
    });

    this.logger.log(
      formatStructuredLog('artist_bio_draft_published', {
        artistBioJobId: draft.jobId,
        concertId: draft.concertId,
        draftId: draft.id,
      }),
    );

    return {
      concertId: updatedConcert.id,
      draftId: draft.id,
      jobId: draft.jobId,
      publishedArtistBio: updatedConcert.publishedArtistBio,
      publishedArtistProfiles: normalizeArtistProfiles(
        updatedConcert.publishedArtistProfiles,
      ),
    };
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
    generation: ArtistBioGenerationResult,
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
          content: generation.draftContent,
          artistProfiles: toArtistProfilesJson(generation.artistProfiles),
          reviewStatus: 'pending_review',
          providerVersion: metadata.providerVersion,
          modelVersion: metadata.modelVersion,
          promptVersion: metadata.promptVersion,
        },
        update: {
          content: generation.draftContent,
          artistProfiles: toArtistProfilesJson(generation.artistProfiles),
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

function toArtistProfilesJson(
  profiles: ReturnType<typeof normalizeArtistProfiles>,
): Prisma.InputJsonValue {
  return profiles as unknown as Prisma.InputJsonValue;
}
