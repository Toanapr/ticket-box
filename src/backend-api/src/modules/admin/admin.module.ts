import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ArtistBioModule } from '../artist-bio/artist-bio.module';
import { ConcertPosterModule } from '../concert-poster/concert-poster.module';
import { GuestListModule } from '../guest-list/guest-list.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminScannerController } from './admin-scanner.controller';
import { AdminScannerService } from './admin-scanner.service';

@Module({
  imports: [AuthModule, ArtistBioModule, ConcertPosterModule, GuestListModule],
  controllers: [AdminController, AdminScannerController],
  providers: [AdminService, AdminScannerService],
})
export class AdminModule {}
