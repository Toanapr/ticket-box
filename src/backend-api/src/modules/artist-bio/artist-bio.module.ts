import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ArtistBioController } from './artist-bio.controller';
import { MockArtistBioAiAdapter } from './artist-bio-ai.adapter';
import { ArtistBioQueueService } from './artist-bio-queue.service';
import { ArtistBioService } from './artist-bio.service';
import { ArtistBioStorageService } from './artist-bio-storage.service';
import { ArtistBioTextService } from './artist-bio-text.service';
import { ArtistBioWorker } from './artist-bio.worker';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [ArtistBioController],
  providers: [
    ArtistBioService,
    ArtistBioQueueService,
    ArtistBioStorageService,
    ArtistBioTextService,
    ArtistBioWorker,
    MockArtistBioAiAdapter,
  ],
  exports: [ArtistBioService, ArtistBioWorker],
})
export class ArtistBioModule {}
