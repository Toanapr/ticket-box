import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ManifestQueryDto } from './dto/manifest-query.dto';
import { ScannerCheckInSyncDto } from './dto/scanner-check-in-sync.dto';
import { ScannerAuthGuard } from './scanner-auth.guard';
import { ScannerLoggerService } from './scanner-logger.service';
import { ScannerService } from './scanner.service';
import type { ScannerRequest } from './scanner-request-context';

@Controller('scanner')
@UseGuards(ScannerAuthGuard)
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
    private readonly scannerLogger: ScannerLoggerService,
  ) {}

  @Get('assignment')
  async getAssignment(
    @Headers('x-device-id') deviceId: string | undefined,
    @Req() request: ScannerRequest,
  ) {
    const normalizedDeviceId = this.scannerService.assertDeviceHeader(deviceId);
    const response = await this.scannerService.getCurrentAssignment(
      normalizedDeviceId,
      request.scannerPrincipal!.userId,
    );

    this.scannerLogger.log('scanner.assignment.served', {
      correlationId: request.correlationId,
      deviceId: normalizedDeviceId,
      scannerUserId: request.scannerPrincipal!.userId,
      assignmentId: response.assignmentId,
      eventId: response.eventId,
      gateCode: response.gateCode,
      zoneCode: response.zoneCode,
    });

    return response;
  }

  @Get('manifest')
  async getManifest(
    @Headers('x-device-id') deviceId: string | undefined,
    @Query() query: ManifestQueryDto,
    @Req() request: ScannerRequest,
  ) {
    const normalizedDeviceId = this.scannerService.assertDeviceHeader(deviceId);
    const normalizedQuery = this.scannerService.normalizeManifestQuery(query);
    const response = await this.scannerService.getManifest(
      normalizedDeviceId,
      request.scannerPrincipal!.userId,
      normalizedQuery,
    );

    this.scannerLogger.log('scanner.manifest.served', {
      correlationId: request.correlationId,
      deviceId: normalizedDeviceId,
      scannerUserId: request.scannerPrincipal!.userId,
      assignmentId: response.assignmentId,
      eventId: response.eventId,
      version: response.version,
      chunkIndex: response.chunkIndex,
      chunkSize: response.chunkSize,
      totalChunks: response.totalChunks,
      isChunked: response.isChunked,
      ticketCount: response.tickets.length,
      revokedCount: response.revokedTickets.length,
      guestCount: response.guestList.length,
    });

    return response;
  }

  @Post('check-in-sync')
  @HttpCode(HttpStatus.OK)
  syncCheckIns(
    @Headers('x-device-id') deviceId: string | undefined,
    @Body() dto: ScannerCheckInSyncDto,
    @Req() request: ScannerRequest,
  ) {
    const normalizedDeviceId = this.scannerService.assertDeviceHeader(deviceId);
    this.scannerService.validateSyncEnvelope(dto, normalizedDeviceId);
    return this.scannerService.syncCheckIns(
      normalizedDeviceId,
      request.scannerPrincipal!.userId,
      dto,
      request.correlationId,
    );
  }
}
