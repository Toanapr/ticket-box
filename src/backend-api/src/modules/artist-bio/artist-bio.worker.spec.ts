/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { ArtistBioWorker } from './artist-bio.worker';

describe('ArtistBioWorker', () => {
  const jobFindUnique = jest.fn();
  const jobUpdate = jest.fn();
  const draftUpsert = jest.fn();
  const transaction = jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      artistBioDraft: { upsert: draftUpsert },
      artistBioJob: { update: jobUpdate },
    }),
  );
  const ai = { generate: jest.fn() };
  const storage = { read: jest.fn() };
  const textService = { extractTextFromPdf: jest.fn() };

  const worker = new ArtistBioWorker(
    ai,
    {
      artistBioJob: {
        findUnique: jobFindUnique,
        update: jobUpdate,
      },
      $transaction: transaction,
    } as never,
    storage as never,
    textService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jobFindUnique.mockResolvedValue({
      id: 'job-id',
      objectKey: 'object-key',
      status: 'queued',
      retryCount: 0,
      maxRetries: 2,
      draft: null,
      concert: {
        artistName: 'Test Artist',
        title: 'Test Concert',
      },
    });
    storage.read.mockResolvedValue(Buffer.from('%PDF-1.4'));
    textService.extractTextFromPdf.mockReturnValue('Clean artist biography');
    ai.generate.mockResolvedValue({
      content: 'Generated artist bio',
      promptVersion: 'artist-bio-v1',
      modelProviderVersion: 'mock-artist-bio-v1',
    });
  });

  it('extracts text, calls AI and upserts exactly one draft', async () => {
    await worker.processJob('job-id');

    expect(ai.generate).toHaveBeenCalledWith({
      artistName: 'Test Artist',
      concertTitle: 'Test Concert',
      extractedText: 'Clean artist biography',
    });
    expect(draftUpsert).toHaveBeenCalledWith({
      where: { jobId: 'job-id' },
      create: expect.objectContaining({
        jobId: 'job-id',
        generatedContent: 'Generated artist bio',
        reviewStatus: 'pending_review',
      }),
      update: expect.objectContaining({
        generatedContent: 'Generated artist bio',
      }),
    });
    expect(jobUpdate).toHaveBeenLastCalledWith({
      where: { id: 'job-id' },
      data: expect.objectContaining({
        status: 'draft_ready',
        extractedText: 'Clean artist biography',
      }),
    });
  });

  it('skips duplicate messages after a draft is ready', async () => {
    jobFindUnique.mockResolvedValue({
      id: 'job-id',
      status: 'draft_ready',
      draft: { id: 'draft-id' },
    });

    await worker.processJob('job-id');

    expect(ai.generate).not.toHaveBeenCalled();
    expect(draftUpsert).not.toHaveBeenCalled();
  });

  it('fails unreadable PDFs without retrying', async () => {
    textService.extractTextFromPdf.mockImplementation(() => {
      throw new BadRequestException('PDF does not contain extractable text');
    });

    await worker.processJob('job-id');

    expect(ai.generate).not.toHaveBeenCalled();
    expect(jobUpdate).toHaveBeenLastCalledWith({
      where: { id: 'job-id' },
      data: expect.objectContaining({
        status: 'failed',
        retryCount: 0,
        errorCode: 'PDF_UNREADABLE',
        dlqReason: 'non_retryable',
      }),
    });
  });

  it('retries AI failures with a bounded budget then marks failed', async () => {
    ai.generate.mockRejectedValue(new Error('AI timeout'));

    await worker.processJob('job-id');

    expect(ai.generate).toHaveBeenCalledTimes(3);
    expect(jobUpdate).toHaveBeenLastCalledWith({
      where: { id: 'job-id' },
      data: expect.objectContaining({
        status: 'failed',
        retryCount: 2,
        errorCode: 'AI_RETRY_EXHAUSTED',
        dlqReason: 'retry_budget_exhausted',
      }),
    });
  });
});
