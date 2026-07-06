import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ARTIST_BIO_PROVIDER } from './artist-bio-ai.provider';
import { ArtistBioProcessorService } from './artist-bio-processor.service';
import { ArtistBioQueueService } from './artist-bio-queue.service';
import { ArtistBioService } from './artist-bio.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';
import { ArtistBioWorker } from './artist-bio.worker';
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
      useExisting: MockArtistBioProvider,
    },
  ],
  exports: [ArtistBioService, ArtistBioProcessorService],
})
export class ArtistBioModule {}
