import { Logger } from '@nestjs/common';
import {
  ArtistBioGenerationInput,
  ArtistBioProvider,
  ArtistBioProviderTimeoutError,
} from './artist-bio-ai.provider';

export class FallbackArtistBioProvider implements ArtistBioProvider {
  readonly providerVersion: string;
  readonly modelVersion: string;
  private readonly logger = new Logger(FallbackArtistBioProvider.name);

  constructor(
    private readonly primary: ArtistBioProvider,
    private readonly fallback: ArtistBioProvider,
  ) {
    this.providerVersion = `${primary.providerVersion}+fallback`;
    this.modelVersion = primary.modelVersion;
  }

  async generateBio(input: ArtistBioGenerationInput): Promise<string> {
    try {
      return await this.primary.generateBio(input);
    } catch (error) {
      if (error instanceof ArtistBioProviderTimeoutError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Primary artist bio provider failed, falling back to mock provider: ${message}`,
      );

      return this.fallback.generateBio(input);
    }
  }
}
