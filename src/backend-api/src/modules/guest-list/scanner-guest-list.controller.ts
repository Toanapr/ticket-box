import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { GuestListImportService } from './guest-list-import.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles('scanner')
@Controller('scanner')
export class ScannerGuestListController {
  constructor(private readonly guestListImportService: GuestListImportService) {}

  @Get('concerts/:id/manifest')
  manifest(
    @CurrentUser() _user: CurrentUser,
    @Param('id') id: string,
    @Query('zoneCode') zoneCode?: string,
  ) {
    return this.guestListImportService.getScannerManifest(id, zoneCode);
  }
}
