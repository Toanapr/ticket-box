import { ArtistBioProcessorService } from './artist-bio-processor.service';
import { ARTIST_BIO_PROVIDER } from './artist-bio-ai.provider';
import { ArtistBioService } from './artist-bio.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';

function pdfBuffer(body: string) {
  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Length 80 >>
stream
BT
(${body}) Tj
ET
endstream
endobj
%%EOF`);
}

describe('ArtistBioProcessorService', () => {
  const claimNextJob = jest.fn();
  const findJobForProcessing = jest.fn();
  const markDraftReady = jest.fn();
  const rescheduleFailedAttempt = jest.fn();
  const storageRead = jest.fn();
  const generateBio = jest.fn();

  const artistBioService = {
    claimNextJob,
    findJobForProcessing,
    markDraftReady,
    rescheduleFailedAttempt,
  } as unknown as jest.Mocked<ArtistBioService>;

  const storage = {
    read: storageRead,
  } as unknown as jest.Mocked<ArtistBioStorageService>;

  const provider = {
    providerVersion: 'mock-provider-v1',
    modelVersion: 'mock-model-v1',
    generateBio,
  };

  const service = new ArtistBioProcessorService(
    artistBioService,
    storage,
    provider,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    claimNextJob.mockResolvedValue(null);
    findJobForProcessing.mockResolvedValue(null);
    markDraftReady.mockResolvedValue(undefined);
    rescheduleFailedAttempt.mockResolvedValue({ id: 'job-id', status: 'failed' });
    storageRead.mockResolvedValue(
      pdfBuffer(
        'Summer Live Artist brings cinematic pop influences and a strong live presence to the stage tonight.',
      ),
    );
    generateBio.mockResolvedValue('Generated draft bio');
  });

  it('marks the job as failed when the AI provider times out after the retry budget', async () => {
    claimNextJob.mockResolvedValue({
      id: 'job-id',
      concertId: 'concert-id',
      rawObjectKey: 'artist-bio.pdf',
      status: 'processing',
      attemptCount: 1,
      maxAttempts: 1,
      concert: { artistName: 'Summer Live Artist' },
    });
    findJobForProcessing.mockResolvedValue({ id: 'job-id', status: 'failed' });
    generateBio.mockRejectedValue(new Error('AI artist bio provider timed out'));

    await expect(service.runNextJob()).resolves.toEqual({
      processed: true,
      jobId: 'job-id',
      status: 'failed',
    });

    expect(markDraftReady).not.toHaveBeenCalled();
    expect(rescheduleFailedAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'job-id' }),
      'AI artist bio provider timed out',
    );
  });

  it('skips duplicate processing after a draft already exists for the same job', async () => {
    findJobForProcessing
      .mockResolvedValueOnce({
        id: 'job-id',
        concertId: 'concert-id',
        rawObjectKey: 'artist-bio.pdf',
        status: 'processing',
        attemptCount: 1,
        maxAttempts: 3,
        concert: { artistName: 'Summer Live Artist' },
      })
      .mockResolvedValueOnce({
        id: 'job-id',
        status: 'draft_ready',
        draft: { id: 'draft-id' },
      });

    await expect(service.processJob('job-id')).resolves.toBe('processed');
    await expect(service.processJob('job-id')).resolves.toBe('skipped');

    expect(markDraftReady).toHaveBeenCalledTimes(1);
  });
});
