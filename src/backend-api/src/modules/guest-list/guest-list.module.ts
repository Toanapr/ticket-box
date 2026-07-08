import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GuestListEmailService } from './guest-list-email.service';
import { GuestListImportService } from './guest-list-import.service';
import { GuestListStorageService } from './guest-list-storage.service';
import { ScannerGuestListController } from './scanner-guest-list.controller';

@Module({
  imports: [AuthModule],
  controllers: [ScannerGuestListController],
  providers: [
    GuestListImportService,
    GuestListStorageService,
    GuestListEmailService,
  ],
  exports: [GuestListImportService],
})
export class GuestListModule {}
