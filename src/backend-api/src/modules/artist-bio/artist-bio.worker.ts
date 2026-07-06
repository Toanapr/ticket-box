import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { formatStructuredLog } from '../../common/logging/structured-log.util';
import { ArtistBioProcessorService } from './artist-bio-processor.service';

@Injectable()
export class ArtistBioWorker {
  private readonly logger = new Logger(ArtistBioWorker.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly processor: ArtistBioProcessorService,
  ) {}

  @Interval(5_000)
  async tick(): Promise<void> {
    if (this.running || !this.isWorkerEnabled()) {
      return;
    }

    this.running = true;
    try {
      const result = await this.processor.runNextJob();
      if (result.processed) {
        this.logger.log(
          formatStructuredLog('artist_bio_worker_tick', {
            artistBioJobId: result.jobId,
            status: result.status,
          }),
        );
      }
    } finally {
      this.running = false;
    }
  }

  private isWorkerEnabled(): boolean {
    const configuredValue = this.configService.get<string>('ARTIST_BIO_WORKER_ENABLED');
    if (!configuredValue) {
      return true;
    }
    return configuredValue.toLowerCase() !== 'false';
  }
}
