import { Inject, Injectable, Logger } from '@nestjs/common';
import { ArtistBioJob } from '@prisma/client';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import {
  ARTIST_BIO_DEFAULT_TIMEOUT_MS,
  ARTIST_BIO_LEASE_MS,
  ARTIST_BIO_PROMPT_VERSION,
} from './artist-bio.constants';
import {
  ARTIST_BIO_PROVIDER,
} from './artist-bio-ai.provider';
import type { ArtistBioProvider } from './artist-bio-ai.provider';
import { extractPdfText, sanitizeArtistBioSourceText } from './artist-bio-pdf.util';
import { ArtistBioService } from './artist-bio.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';

@Injectable()
export class ArtistBioProcessorService {
  private readonly logger = new Logger(ArtistBioProcessorService.name);

  constructor(
    private readonly artistBioService: ArtistBioService,
    private readonly storage: ArtistBioStorageService,
    @Inject(ARTIST_BIO_PROVIDER)
    private readonly provider: ArtistBioProvider,
  ) {}

  async runNextJob(): Promise<{ processed: boolean; jobId?: string; status?: string }> {
    const job = await this.artistBioService.claimNextJob(ARTIST_BIO_LEASE_MS);
    if (!job) {
      return { processed: false };
    }

    await this.processClaimedJob(job);
    const latest = await this.artistBioService.findJobForProcessing(job.id);
    return {
      processed: true,
      jobId: job.id,
      status: latest?.status,
    };
  }

  async processJob(jobId: string): Promise<'processed' | 'skipped'> {
    const job = await this.artistBioService.findJobForProcessing(jobId);
    if (!job || job.status !== 'processing') {
      return 'skipped';
    }

    await this.processClaimedJob(job);
    return 'processed';
  }

  private async processClaimedJob(job: ArtistBioJob & { concert: { artistName: string } }) {
    if (job.status !== 'processing') {
      return;
    }

    try {
      const buffer = await this.storage.read(job.rawObjectKey);
      const extractedText = extractPdfText(buffer);
      const sanitizedText = sanitizeArtistBioSourceText(extractedText);

      if (sanitizedText.length < 40) {
        throw new Error(
          'The uploaded PDF does not contain enough extractable text for artist bio generation',
        );
      }

      const draftContent = await this.provider.generateBio({
        artistName: job.concert.artistName,
        sourceText: sanitizedText,
        timeoutMs: ARTIST_BIO_DEFAULT_TIMEOUT_MS,
      });

      await this.artistBioService.markDraftReady(job.id, draftContent, {
        extractedText,
        sanitizedText,
        providerVersion: this.provider.providerVersion,
        modelVersion: this.provider.modelVersion,
        promptVersion: ARTIST_BIO_PROMPT_VERSION,
      });

      this.logger.log(
        formatStructuredLog('artist_bio_job_draft_ready', {
          artistBioJobId: job.id,
          concertId: job.concertId,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const updated = await this.artistBioService.rescheduleFailedAttempt(job, message);
      this.logger.warn(
        formatStructuredLog('artist_bio_job_failed', {
          artistBioJobId: job.id,
          concertId: job.concertId,
          status: updated.status,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
          error: message,
        }),
      );
    }
  }
}
