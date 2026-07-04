import { Injectable, RequestTimeoutException } from '@nestjs/common';

export const ARTIST_BIO_PROMPT_VERSION = 'artist-bio-v1';
export const ARTIST_BIO_PIPELINE_VERSION = 'pipeline-v1';

export interface GenerateArtistBioInput {
  concertTitle: string;
  artistName: string;
  extractedText: string;
}

export interface GenerateArtistBioResult {
  content: string;
  promptVersion: string;
  modelProviderVersion: string;
}

export interface ArtistBioAiAdapter {
  generate(input: GenerateArtistBioInput): Promise<GenerateArtistBioResult>;
}

@Injectable()
export class MockArtistBioAiAdapter implements ArtistBioAiAdapter {
  async generate(
    input: GenerateArtistBioInput,
  ): Promise<GenerateArtistBioResult> {
    await Promise.resolve();

    const mode = process.env.ARTIST_BIO_MOCK_MODE ?? 'success';
    if (mode === 'timeout') {
      throw new RequestTimeoutException('AI provider timed out');
    }
    if (mode === 'failure') {
      throw new Error('AI provider failed');
    }

    const sourceSummary = input.extractedText
      .split(/[.!?]/)
      .map((part) => part.trim())
      .find(Boolean);

    const basis = sourceSummary ?? input.extractedText.slice(0, 220);
    return {
      content:
        `${input.artistName} is featured in ${input.concertTitle}. ${basis}`.slice(
          0,
          700,
        ),
      promptVersion: ARTIST_BIO_PROMPT_VERSION,
      modelProviderVersion: 'mock-artist-bio-v1',
    };
  }
}
