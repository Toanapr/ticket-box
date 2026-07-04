import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MockArtistBioAiAdapter } from './artist-bio-ai.adapter';
import { ArtistBioStorageService } from './artist-bio-storage.service';
import { ArtistBioTextService } from './artist-bio-text.service';

@Injectable()
export class ArtistBioWorker {
  private readonly logger = new Logger(ArtistBioWorker.name);

  constructor(
    private readonly aiAdapter: MockArtistBioAiAdapter,
    private readonly prisma: PrismaService,
    private readonly storage: ArtistBioStorageService,
    private readonly textService: ArtistBioTextService,
  ) {}

  async processJob(jobId: string): Promise<void> {
    const job = await this.prisma.artistBioJob.findUnique({
      where: { id: jobId },
      include: { concert: true, draft: true },
    });

    if (!job) {
      this.logger.warn(`artist_bio_job_id=${jobId} not found`);
      return;
    }

    if (job.status === 'draft_ready' && job.draft) {
      this.logger.log(`artist_bio_job_id=${jobId} already completed`);
      return;
    }

    if (job.status !== 'queued' && job.status !== 'failed') {
      this.logger.log(
        `artist_bio_job_id=${jobId} skipped because status=${job.status}`,
      );
      return;
    }

    await this.prisma.artistBioJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        errorCode: null,
        errorMessage: null,
        dlqReason: null,
        dlqAt: null,
      },
    });

    let retryCount = job.retryCount;
    for (;;) {
      try {
        const pdf = await this.storage.read(job.objectKey);
        const extractedText = await this.textService.extractTextFromPdf(pdf);
        const generated = await this.aiAdapter.generate({
          artistName: job.concert.artistName,
          concertTitle: job.concert.title,
          extractedText,
        });

        await this.prisma.$transaction(async (tx) => {
          await tx.artistBioDraft.upsert({
            where: { jobId },
            create: {
              jobId,
              generatedContent: generated.content,
              editedContent: null,
              reviewStatus: 'pending_review',
              promptVersion: generated.promptVersion,
              modelProviderVersion: generated.modelProviderVersion,
            },
            update: {
              generatedContent: generated.content,
              promptVersion: generated.promptVersion,
              modelProviderVersion: generated.modelProviderVersion,
            },
          });

          await tx.artistBioJob.update({
            where: { id: jobId },
            data: {
              status: 'draft_ready',
              extractedText,
              retryCount,
              errorCode: null,
              errorMessage: null,
              dlqReason: null,
              dlqAt: null,
            },
          });
        });

        this.logger.log(`artist_bio_job_id=${jobId} draft persisted`);
        return;
      } catch (error) {
        const retryable = isRetryableAiError(error);
        const message = error instanceof Error ? error.message : String(error);

        if (retryable && retryCount < job.maxRetries) {
          retryCount += 1;
          await this.prisma.artistBioJob.update({
            where: { id: jobId },
            data: {
              retryCount,
              errorCode: 'AI_RETRYABLE_ERROR',
              errorMessage: message,
            },
          });
          this.logger.warn(
            `artist_bio_job_id=${jobId} retry=${retryCount} error=${message}`,
          );
          continue;
        }

        await this.prisma.artistBioJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            retryCount,
            errorCode: retryable ? 'AI_RETRY_EXHAUSTED' : 'PDF_UNREADABLE',
            errorMessage: message,
            dlqReason: retryable ? 'retry_budget_exhausted' : 'non_retryable',
            dlqAt: new Date(),
          },
        });
        this.logger.warn(`artist_bio_job_id=${jobId} failed error=${message}`);
        return;
      }
    }
  }
}

function isRetryableAiError(error: unknown): boolean {
  return !(error instanceof BadRequestException);
}
