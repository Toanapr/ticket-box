import { Injectable, Logger } from '@nestjs/common';
import { formatStructuredLog } from '../../common/logging/structured-log.util';

@Injectable()
export class ArtistBioQueueService {
  private readonly logger = new Logger(ArtistBioQueueService.name);

  async publish(jobId: string): Promise<void> {
    this.logger.log(
      formatStructuredLog('artist_bio_job_enqueued', {
        artistBioJobId: jobId,
      }),
    );
  }
}
