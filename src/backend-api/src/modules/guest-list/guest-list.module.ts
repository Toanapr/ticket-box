import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GuestListImportService } from './guest-list-import.service';
import { GuestListStorageService } from './guest-list-storage.service';
import { ScannerGuestListController } from './scanner-guest-list.controller';

@Module({
  imports: [AuthModule],
  controllers: [ScannerGuestListController],
  providers: [GuestListImportService, GuestListStorageService],
  exports: [GuestListImportService],
})
export class GuestListModule {}
