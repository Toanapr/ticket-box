export interface ArtistBioGenerationInput {
  artistName: string;
  sourceText: string;
  timeoutMs: number;
}

export interface ArtistBioProvider {
  readonly providerVersion: string;
  readonly modelVersion: string;
  generateBio(input: ArtistBioGenerationInput): Promise<string>;
}

export const ARTIST_BIO_PROVIDER = Symbol('ARTIST_BIO_PROVIDER');

export class ArtistBioProviderTimeoutError extends Error {
  constructor(message = 'AI artist bio provider timed out') {
    super(message);
  }
}
