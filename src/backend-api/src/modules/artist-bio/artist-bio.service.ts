import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import { PrismaService } from '../../prisma/prisma.service';
import { ARTIST_BIO_PIPELINE_VERSION } from './artist-bio-ai.adapter';
import { ArtistBioQueueService } from './artist-bio-queue.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';

@Injectable()
export class ArtistBioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: ArtistBioQueueService,
    private readonly storage: ArtistBioStorageService,
  ) {}

  async createJob(
    user: CurrentUser,
    concertId: string,
    file: Express.Multer.File,
  ) {
    const concert = await this.findAuthorizedConcert(user, concertId);
    const stored = await this.storage.save(
      concert.id,
      ARTIST_BIO_PIPELINE_VERSION,
      file,
    );

    const job = await this.upsertJob(
      concert.id,
      stored.objectKey,
      stored.checksum,
    );

    await this.queue.publish({
      artistBioJobId: job.id,
      pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
    });

    return this.getJobById(job.id);
  }

  async getLatestJob(user: CurrentUser, concertId: string) {
    await this.findAuthorizedConcert(user, concertId);

    return this.prisma.artistBioJob.findFirst({
      where: { concertId },
      include: { draft: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async retryJob(user: CurrentUser, jobId: string) {
    const job = await this.prisma.artistBioJob.findUnique({
      where: { id: jobId },
      include: { concert: true },
    });

    if (!job) {
      throw new NotFoundException('Artist bio job not found');
    }

    this.assertCanManageConcert(user, job.concert.organizationId);

    if (job.status !== 'failed') {
      throw new ConflictException('Only failed artist bio jobs can be retried');
    }

    const updated = await this.prisma.artistBioJob.update({
      where: { id: jobId },
      data: {
        status: 'queued',
        retryCount: 0,
        errorCode: null,
        errorMessage: null,
        dlqReason: null,
        dlqAt: null,
      },
    });

    await this.queue.publish({
      artistBioJobId: updated.id,
      pipelineVersion: updated.pipelineVersion,
    });

    return this.getJobById(updated.id);
  }

  private async upsertJob(
    concertId: string,
    objectKey: string,
    checksum: string,
  ) {
    try {
      return await this.prisma.artistBioJob.create({
        data: {
          concertId,
          objectKey,
          checksum,
          pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
          status: 'queued',
          retryCount: 0,
          maxRetries: 2,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      return this.prisma.artistBioJob.findUniqueOrThrow({
        where: {
          concertId_checksum_pipelineVersion: {
            concertId,
            checksum,
            pipelineVersion: ARTIST_BIO_PIPELINE_VERSION,
          },
        },
      });
    }
  }

  private async getJobById(jobId: string) {
    return this.prisma.artistBioJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { draft: true },
    });
  }

  private async findAuthorizedConcert(user: CurrentUser, concertId: string) {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      throw new NotFoundException('Concert not found');
    }

    this.assertCanManageConcert(user, concert.organizationId);
    return concert;
  }

  private assertCanManageConcert(user: CurrentUser, organizationId: string) {
    if (user.role === 'system_admin') {
      return;
    }

    if (!user.organizationId) {
      throw new ForbiddenException('Organizer must belong to an organization');
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException('Concert belongs to another organization');
    }
  }
}

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
