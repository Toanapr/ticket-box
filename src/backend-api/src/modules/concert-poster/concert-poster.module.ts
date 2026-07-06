import { Module } from '@nestjs/common';
import { ConcertPosterStorageService } from './concert-poster-storage.service';

@Module({
  providers: [ConcertPosterStorageService],
  exports: [ConcertPosterStorageService],
})
export class ConcertPosterModule {}
