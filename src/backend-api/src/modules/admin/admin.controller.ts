import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { GuestListImportService } from '../guest-list/guest-list-import.service';
import type { ConcertBody, TicketTypeBody } from './dto/admin.dto';

@UseGuards(AuthGuard, RolesGuard)
@Roles('organizer')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly guestListImportService: GuestListImportService,
  ) {}

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

  @Delete('concerts/:id')
  deleteConcert(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.adminService.deleteConcert(user, id);
  }

  @Put('concerts/:id/poster')
  @UseInterceptors(
    FileInterceptor('poster', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  uploadPoster(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(jpeg|jpg|png|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.adminService.uploadPoster(user, id, file);
  }

  @Post('concerts/:id/guest-list/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  importGuestList(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.guestListImportService.importCsv(user, id, file);
  }

  @Get('concerts/:id/guest-list/imports')
  listGuestListImports(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.guestListImportService.listImports(user, id);
  }

  @Get('concerts/:id/guest-list/entries')
  listGuestListEntries(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.guestListImportService.listActiveEntries(user, id);
  }

  @Delete('concerts/:id/guest-list')
  deleteGuestList(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.guestListImportService.deleteActiveGuestList(user, id);
  }

  @Get('guest-list/imports/:batchId/errors')
  listGuestListImportErrors(
    @CurrentUser() user: CurrentUser,
    @Param('batchId') batchId: string,
  ) {
    return this.guestListImportService.listImportErrors(user, batchId);
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
