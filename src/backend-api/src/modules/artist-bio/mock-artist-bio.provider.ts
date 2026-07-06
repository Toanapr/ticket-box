import { Injectable } from '@nestjs/common';
import {
  ArtistBioGenerationInput,
  ArtistBioProvider,
  ArtistBioProviderTimeoutError,
} from './artist-bio-ai.provider';

@Injectable()
export class MockArtistBioProvider implements ArtistBioProvider {
  readonly providerVersion = 'mock-provider-v1';
  readonly modelVersion = 'mock-model-v1';

  async generateBio(input: ArtistBioGenerationInput): Promise<string> {
    if (input.sourceText.includes('[[AI_TIMEOUT]]')) {
      throw new ArtistBioProviderTimeoutError();
    }

    const normalized = input.sourceText.replace(/\s+/g, ' ').trim();
    const summary = normalized.slice(0, 420);
    const closing = summary.endsWith('.') ? '' : '.';
    return `${input.artistName} is featured in this concert. ${summary}${closing}`;
  }
}
