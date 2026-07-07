import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminScannerService } from './admin-scanner.service';
import { AssignScannerDto, ProvisionScannerDto } from './dto/scanner-admin.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles('organizer')
@Controller('admin/scanners')
export class AdminScannerController {
  constructor(private readonly adminScannerService: AdminScannerService) {}

  @Get()
  listDevices(@CurrentUser() user: CurrentUser) {
    return this.adminScannerService.listDevices(user);
  }

  @Post()
  provisionDevice(@CurrentUser() user: CurrentUser, @Body() body: ProvisionScannerDto) {
    return this.adminScannerService.provisionDevice(user, body);
  }

  @Post(':id/assign')
  assignDevice(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: AssignScannerDto,
  ) {
    return this.adminScannerService.assignDevice(user, id, body);
  }

  @Post(':id/revoke')
  revokeDevice(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.adminScannerService.revokeDevice(user, id);
  }
}
