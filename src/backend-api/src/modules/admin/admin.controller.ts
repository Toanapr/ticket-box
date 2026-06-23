import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import type { ConcertBody, TicketTypeBody } from './dto/admin.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles('organizer')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('concerts')
  listConcerts(@CurrentUser() user: CurrentUser) {
    return this.adminService.listConcerts(user);
  }

  @Get('concerts/:id')
  getConcert(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.adminService.getConcert(user, id);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: CurrentUser) {
    return this.adminService.listNotificationRecords(user);
  }

  @Post('concerts')
  createConcert(@CurrentUser() user: CurrentUser, @Body() body: ConcertBody) {
    return this.adminService.createConcert(user, body);
  }

  @Patch('concerts/:id')
  updateConcert(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: ConcertBody,
  ) {
    return this.adminService.updateConcert(user, id, body);
  }

  @Post('concerts/:id/ticket-types')
  createTicketType(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: TicketTypeBody,
  ) {
    return this.adminService.createTicketType(user, id, body);
  }

  @Patch('ticket-types/:id')
  updateTicketType(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: TicketTypeBody,
  ) {
    return this.adminService.updateTicketType(user, id, body);
  }
}
