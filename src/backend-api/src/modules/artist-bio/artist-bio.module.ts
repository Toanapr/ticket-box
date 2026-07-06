import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ARTIST_BIO_PROVIDER } from './artist-bio-ai.provider';
import { ArtistBioProcessorService } from './artist-bio-processor.service';
import { ArtistBioQueueService } from './artist-bio-queue.service';
import { ArtistBioService } from './artist-bio.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';
import { ArtistBioWorker } from './artist-bio.worker';
import { FallbackArtistBioProvider } from './fallback-artist-bio.provider';
import { GeminiArtistBioProvider } from './gemini-artist-bio.provider';
import { MockArtistBioProvider } from './mock-artist-bio.provider';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    ArtistBioStorageService,
    ArtistBioQueueService,
    ArtistBioService,
    ArtistBioProcessorService,
    ArtistBioWorker,
    MockArtistBioProvider,
    {
      provide: ARTIST_BIO_PROVIDER,
      inject: [ConfigService, MockArtistBioProvider],
      useFactory: (
        configService: ConfigService,
        mockProvider: MockArtistBioProvider,
      ) => {
        const apiKey =
          configService.get<string>('GEMINI_API_KEY')?.trim() ||
          configService.get<string>('GOOGLE_API_KEY')?.trim();
        const modelVersion =
          configService.get<string>('GEMINI_MODEL')?.trim() ||
          'gemini-2.5-flash';

        if (!apiKey) {
          return mockProvider;
        }

        return new FallbackArtistBioProvider(
          new GeminiArtistBioProvider(apiKey, modelVersion),
          mockProvider,
        );
      },
    },
  ],
  exports: [ArtistBioService, ArtistBioProcessorService],
})
export class ArtistBioModule {}
