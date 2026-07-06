import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { CheckInResultStatus } from '@prisma/client';
import { ManifestQueryDto } from './dto/manifest-query.dto';
import { ScannerAssignmentResponseDto } from './dto/scanner-assignment-response.dto';
import { ScannerCheckInSyncDto } from './dto/scanner-check-in-sync.dto';
import {
  ScannerCheckInSyncResponseDto,
  ScannerCheckInSyncResultDto,
} from './dto/scanner-check-in-sync-response.dto';
import { ScannerCheckInReason } from './enums/scanner-check-in-reason.enum';
import { ScannerCheckInResult } from './enums/scanner-check-in-result.enum';
import { ScannerManifestResponseDto } from './dto/scanner-manifest-response.dto';
import { ScannerLoggerService } from './scanner-logger.service';
import { ScannerMetricsService } from './scanner-metrics.service';
import { ScannerRepository } from './scanner.repository';
import { signScannerManifest } from './scanner-manifest-signature.util';

type ManifestPayload = NonNullable<
  Awaited<ReturnType<ScannerRepository['findManifestPayloadByAssignmentId']>>
>;

@Injectable()
export class ScannerService {
  constructor(
    private readonly scannerRepository: ScannerRepository,
    private readonly scannerLogger: ScannerLoggerService,
    private readonly scannerMetrics: ScannerMetricsService,
  ) {}

  assertDeviceHeader(deviceId: string | undefined): string {
    if (!deviceId || deviceId.trim().length === 0) {
      throw new BadRequestException({
        error: 'invalid_device_id',
        message: 'x-device-id header is required',
      });
    }

    return deviceId;
  }

  normalizeManifestQuery(query: ManifestQueryDto): ManifestQueryDto {
    const normalizedQuery: ManifestQueryDto = {};
    const rawQuery = query as ManifestQueryDto & {
      chunkIndex?: number | string;
      chunkSize?: number | string;
    };

    if (query.assignmentId) {
      normalizedQuery.assignmentId = query.assignmentId;
    }

    if (rawQuery.chunkIndex !== undefined) {
      const parsedChunkIndex = this.parseInteger(rawQuery.chunkIndex);

      if (parsedChunkIndex === null || parsedChunkIndex < 0) {
        throw new BadRequestException({
          error: 'invalid_manifest_chunk_index',
          message: 'chunkIndex must be an integer greater than or equal to 0',
        });
      }

      normalizedQuery.chunkIndex = parsedChunkIndex;
    }

    if (rawQuery.chunkSize !== undefined) {
      const parsedChunkSize = this.parseInteger(rawQuery.chunkSize);

      if (parsedChunkSize === null || parsedChunkSize < 1) {
        throw new BadRequestException({
          error: 'invalid_manifest_chunk_size',
          message: 'chunkSize must be an integer greater than or equal to 1',
        });
      }

      normalizedQuery.chunkSize = parsedChunkSize;
    }

    if (
      normalizedQuery.chunkIndex !== undefined &&
      normalizedQuery.chunkSize === undefined
    ) {
      throw new BadRequestException({
        error: 'manifest_chunk_size_required',
        message: 'chunkSize is required when chunkIndex is provided',
      });
    }

    return normalizedQuery;
  }

  async getManifest(
    deviceCode: string,
    scannerUserId: string,
    query: ManifestQueryDto,
  ): Promise<ScannerManifestResponseDto> {
    const assignment = await this.getAuthorizedActiveAssignment(deviceCode, scannerUserId);

    if (query.assignmentId && query.assignmentId !== assignment.id) {
      throw new ForbiddenException({
        error: 'scanner_manifest_forbidden',
        message: 'Scanner device is not allowed to download this manifest',
      });
    }

    const manifestSource = await this.scannerRepository.findManifestPayloadByAssignmentId(assignment.id);

    if (!manifestSource) {
      throw new NotFoundException({
        error: 'scanner_manifest_not_found',
        message: 'Manifest was not found for the active assignment',
      });
    }

    const totals = {
      totalTickets: manifestSource.manifestTickets.length,
      totalRevokedTickets: manifestSource.revokedTickets.length,
      totalGuestEntries: manifestSource.guestEntries.length,
    };
    const totalEntries =
      totals.totalTickets + totals.totalRevokedTickets + totals.totalGuestEntries;
    const maxFullEntries = this.getManifestMaxFullEntries();
    const requestedChunkSize = query.chunkSize;

    if (!requestedChunkSize && totalEntries > maxFullEntries) {
      throw new PayloadTooLargeException({
        error: 'scanner_manifest_requires_chunking',
        message: 'Manifest is too large for full download and must be requested in chunks',
        maxFullEntries,
        totalEntries,
        recommendedChunkSize: this.getManifestDefaultChunkSize(),
      });
    }

    const chunkSize = requestedChunkSize
      ? Math.min(requestedChunkSize, this.getManifestMaxChunkSize())
      : null;
    const totalChunks = chunkSize
      ? Math.max(
          1,
          Math.ceil(totals.totalTickets / chunkSize),
          Math.ceil(totals.totalRevokedTickets / chunkSize),
          Math.ceil(totals.totalGuestEntries / chunkSize),
        )
      : 1;
    const chunkIndex = chunkSize ? query.chunkIndex ?? 0 : null;

    if (chunkIndex !== null && chunkIndex >= totalChunks) {
      throw new BadRequestException({
        error: 'invalid_manifest_chunk_index',
        message: 'chunkIndex exceeds available manifest chunk count',
        totalChunks,
      });
    }

    const tickets =
      chunkSize === null
        ? manifestSource.manifestTickets
        : this.sliceChunk(manifestSource.manifestTickets, chunkIndex!, chunkSize);
    const revokedTickets =
      chunkSize === null
        ? manifestSource.revokedTickets
        : this.sliceChunk(manifestSource.revokedTickets, chunkIndex!, chunkSize);
    const guestEntries =
      chunkSize === null
        ? manifestSource.guestEntries
        : this.sliceChunk(manifestSource.guestEntries, chunkIndex!, chunkSize);

    const payloadWithoutSignature = {
      assignmentId: manifestSource.id,
      eventId: manifestSource.eventId,
      concertId: manifestSource.concertId,
      gateCode: manifestSource.gateCode,
      zoneCode: manifestSource.zoneCode,
      version: manifestSource.manifestVersion ?? 1,
      generatedAt: (manifestSource.manifestIssuedAt ?? manifestSource.updatedAt).toISOString(),
      expiresAt: (manifestSource.manifestExpiresAt ?? manifestSource.updatedAt).toISOString(),
      chunkIndex,
      chunkSize,
      totalChunks,
      totalTickets: totals.totalTickets,
      totalRevokedTickets: totals.totalRevokedTickets,
      totalGuestEntries: totals.totalGuestEntries,
      isChunked: chunkSize !== null,
      tickets: tickets.map((ticket) => ({
        ticketRef: ticket.ticketRef,
        rawToken: ticket.rawToken,
        ticketId: ticket.ticketId,
        ticketTypeId: ticket.ticketTypeId,
        status: ticket.status,
        eventId: ticket.eventId,
        gateCode: ticket.gateCode,
        zoneCode: ticket.zoneCode,
      })),
      revokedTickets: revokedTickets.map((ticket) => ({
        ticketRef: ticket.ticketRef,
        reason: ticket.reason,
      })),
      guestList: guestEntries.map((guest) => ({
        guestRef: guest.guestRef,
        displayName: guest.displayName,
        eventId: guest.eventId,
        gateCode: guest.gateCode,
        zoneCode: guest.zoneCode,
      })),
    };

    const signature = signScannerManifest(this.getManifestSigningSecret(), payloadWithoutSignature);

    return {
      ...payloadWithoutSignature,
      signature,
    };
  }

  async getCurrentAssignment(
    deviceCode: string,
    scannerUserId: string,
  ): Promise<ScannerAssignmentResponseDto> {
    const assignment = await this.getAuthorizedActiveAssignment(deviceCode, scannerUserId);
    const device = assignment.device;

    return {
      assignmentId: assignment.id,
      deviceId: device.deviceCode,
      scannerUserId: assignment.scannerUserId,
      status: assignment.status,
      eventId: assignment.eventId,
      concertId: assignment.concertId,
      gateCode: assignment.gateCode,
      zoneCode: assignment.zoneCode,
      manifestVersion: assignment.manifestVersion ?? null,
      manifestGeneratedAt: assignment.manifestIssuedAt?.toISOString() ?? null,
      manifestExpiresAt: assignment.manifestExpiresAt?.toISOString() ?? null,
    };
  }

  private async getAuthorizedActiveAssignment(deviceCode: string, scannerUserId: string) {
    const device = await this.scannerRepository.findDeviceWithActiveAssignments(deviceCode);

    if (!device) {
      throw new NotFoundException({
        error: 'scanner_device_not_found',
        message: 'Scanner device was not found',
      });
    }

    if (!this.scannerRepository.isDeviceActive(device.status)) {
      throw new ForbiddenException({
        error: 'scanner_device_inactive',
        message: 'Scanner device is not active',
      });
    }

    if (device.assignments.length === 0) {
      throw new NotFoundException({
        error: 'scanner_assignment_not_found',
        message: 'No active assignment was found for this scanner device',
      });
    }

    if (device.assignments.length > 1) {
      throw new ConflictException({
        error: 'scanner_assignment_inconsistent',
        message: 'Multiple active assignments were found for this scanner device',
      });
    }

    const assignment = device.assignments[0];

    if (assignment.scannerUserId !== scannerUserId || device.scannerUserId !== scannerUserId) {
      throw new ForbiddenException({
        error: 'scanner_assignment_forbidden',
        message: 'Scanner user is not allowed to access this assignment',
      });
    }

    return {
      ...assignment,
      device,
    };
  }

  private getManifestSigningSecret(): string {
    return process.env.SCANNER_MANIFEST_SIGNING_SECRET?.trim() || 'dev-scanner-manifest-secret';
  }

  async syncCheckIns(
    deviceCode: string,
    scannerUserId: string,
    dto: ScannerCheckInSyncDto,
    correlationId: string,
  ): Promise<ScannerCheckInSyncResponseDto> {
    const assignment = await this.getAuthorizedActiveAssignment(deviceCode, scannerUserId);
    const manifestSource = await this.scannerRepository.findManifestPayloadByAssignmentId(assignment.id);

    if (!manifestSource) {
      throw new NotFoundException({
        error: 'scanner_manifest_not_found',
        message: 'Manifest was not found for the active assignment',
      });
    }

    const ticketsByRef = new Map(
      manifestSource.manifestTickets.map((ticket) => [ticket.ticketRef, ticket] as const),
    );
    const revokedByRef = new Map(
      manifestSource.revokedTickets.map((ticket) => [ticket.ticketRef, ticket] as const),
    );

    const results: ScannerCheckInSyncResultDto[] = [];

    for (const event of dto.events) {
      const ticket = ticketsByRef.get(event.ticketRef);
      const rejectionReason = this.resolveCheckInRejectionReason({
        requestDeviceCode: deviceCode,
        requestScannerUserId: scannerUserId,
        requestAssignmentId: dto.assignmentId,
        requestManifestVersion: dto.manifestVersion,
        assignmentId: assignment.id,
        assignmentEventId: assignment.eventId,
        assignmentGateCode: assignment.gateCode,
        assignmentZoneCode: assignment.zoneCode,
        assignmentManifestVersion: assignment.manifestVersion,
        event,
        ticket,
        revokedTicket: revokedByRef.get(event.ticketRef),
      });

      const recorded = await this.scannerRepository.recordCheckInAttempt({
        assignmentId: assignment.id,
        scannerUserId,
        deviceId: assignment.device.id,
        eventId: assignment.eventId,
        concertId: assignment.concertId,
        gateCode: event.gateCode,
        zoneCode: event.zoneCode,
        manifestVersion: dto.manifestVersion,
        clientEventId: event.clientEventId,
        ticketId: ticket?.ticketId ?? null,
        ticketRef: event.ticketRef,
        rawToken: event.rawToken ?? null,
        clientScannedAt: new Date(event.clientScannedAt),
        rejectionReason,
      });

      const result = this.mapRecordedCheckInResult(recorded.event, recorded.replayed);
      results.push(result);
      this.scannerMetrics.incrementResult(result.result);

      if (recorded.replayed) {
        this.scannerMetrics.incrementDuplicateReplay();
      }

      if (result.result !== ScannerCheckInResult.ACCEPTED || recorded.replayed) {
        this.scannerLogger.warn('scanner.sync.event_outcome', {
          correlationId,
          assignmentId: assignment.id,
          deviceId: deviceCode,
          scannerUserId,
          clientEventId: result.clientEventId,
          checkInEventId: result.checkInEventId,
          ticketId: result.ticketId,
          ticketRef: event.ticketRef,
          result: result.result,
          reason: result.reason,
          winningEventId: result.winningEventId,
        });
      }
    }

    const metricsSnapshot = this.scannerMetrics.snapshot();

    this.scannerLogger.log('scanner.sync.batch_processed', {
      correlationId,
      assignmentId: assignment.id,
      deviceId: deviceCode,
      scannerUserId,
      manifestVersion: dto.manifestVersion,
      requestedEventCount: dto.events.length,
      acceptedCount: results.filter((result) => result.result === ScannerCheckInResult.ACCEPTED).length,
      conflictCount: results.filter((result) => result.result === ScannerCheckInResult.CONFLICT).length,
      rejectedCount: results.filter((result) => result.result === ScannerCheckInResult.REJECTED).length,
      duplicateReplayCount: results.filter(
        (result) => result.reason === ScannerCheckInReason.DUPLICATE_EVENT_REPLAY,
      ).length,
      metrics: metricsSnapshot,
    });

    return {
      assignmentId: assignment.id,
      processedAt: new Date().toISOString(),
      results,
    };
  }

  validateSyncEnvelope(dto: ScannerCheckInSyncDto, deviceId: string): void {
    if (dto.events.some((event) => event.deviceId !== deviceId)) {
      throw new BadRequestException({
        error: 'device_id_mismatch',
        message: 'All sync events must match x-device-id header',
      });
    }

    if (dto.events.some((event) => !this.isUuid(event.clientEventId))) {
      throw new BadRequestException({
        error: 'invalid_client_event_id',
        message: 'All sync events must include a valid UUID clientEventId',
      });
    }

    if (dto.events.some((event) => Number.isNaN(Date.parse(event.clientScannedAt)))) {
      throw new BadRequestException({
        error: 'invalid_client_scanned_at',
        message: 'All sync events must include a valid ISO clientScannedAt timestamp',
      });
    }
  }

  private resolveCheckInRejectionReason(input: {
    requestDeviceCode: string;
    requestScannerUserId: string;
    requestAssignmentId: string;
    requestManifestVersion: number;
    assignmentId: string;
    assignmentEventId: string;
    assignmentGateCode: string;
    assignmentZoneCode: string;
    assignmentManifestVersion: number | null;
    event: ScannerCheckInSyncDto['events'][number];
    ticket: ManifestPayload['manifestTickets'][number] | undefined;
    revokedTicket: ManifestPayload['revokedTickets'][number] | undefined;
  }): ScannerCheckInReason | undefined {
    if (input.requestAssignmentId !== input.assignmentId) {
      return ScannerCheckInReason.INVALID_ASSIGNMENT;
    }

    if (
      input.assignmentManifestVersion !== null &&
      input.requestManifestVersion !== input.assignmentManifestVersion
    ) {
      return ScannerCheckInReason.INVALID_MANIFEST_SCOPE;
    }

    if (input.event.scannerUserId !== input.requestScannerUserId) {
      return ScannerCheckInReason.INVALID_ASSIGNMENT;
    }

    if (input.event.deviceId !== input.requestDeviceCode) {
      return ScannerCheckInReason.INVALID_DEVICE;
    }

    if (input.event.eventId !== input.assignmentEventId) {
      return ScannerCheckInReason.WRONG_EVENT;
    }

    if (input.event.gateCode !== input.assignmentGateCode) {
      return ScannerCheckInReason.WRONG_GATE;
    }

    if (input.event.zoneCode !== input.assignmentZoneCode) {
      return ScannerCheckInReason.WRONG_ZONE;
    }

    if (input.revokedTicket) {
      return ScannerCheckInReason.TICKET_REVOKED;
    }

    if (!input.ticket) {
      return ScannerCheckInReason.TICKET_NOT_FOUND;
    }

    if (input.event.rawToken && input.ticket.rawToken !== input.event.rawToken) {
      return ScannerCheckInReason.INVALID_TICKET_PAYLOAD;
    }

    return undefined;
  }

  private mapRecordedCheckInResult(
    event: {
      id: string;
      clientEventId: string;
      result: CheckInResultStatus;
      reason: string;
      serverRecordedAt: Date;
      winningEventId: string | null;
      ticketId: string | null;
    },
    replayed: boolean,
  ): ScannerCheckInSyncResultDto {
    return {
      clientEventId: event.clientEventId,
      result: this.mapResultStatus(event.result),
      reason: replayed
        ? ScannerCheckInReason.DUPLICATE_EVENT_REPLAY
        : (event.reason as ScannerCheckInReason),
      serverRecordedAt: event.serverRecordedAt.toISOString(),
      winningEventId: event.winningEventId,
      checkInEventId: event.id,
      ticketId: event.ticketId,
    };
  }

  private mapResultStatus(result: CheckInResultStatus): ScannerCheckInResult {
    if (result === CheckInResultStatus.accepted) {
      return ScannerCheckInResult.ACCEPTED;
    }

    if (result === CheckInResultStatus.conflict) {
      return ScannerCheckInResult.CONFLICT;
    }

    return ScannerCheckInResult.REJECTED;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private getManifestMaxFullEntries(): number {
    return this.getPositiveIntegerEnv('SCANNER_MANIFEST_MAX_FULL_ENTRIES', 1000);
  }

  private getManifestDefaultChunkSize(): number {
    return this.getPositiveIntegerEnv('SCANNER_MANIFEST_DEFAULT_CHUNK_SIZE', 250);
  }

  private getManifestMaxChunkSize(): number {
    return this.getPositiveIntegerEnv('SCANNER_MANIFEST_MAX_CHUNK_SIZE', 500);
  }

  private getPositiveIntegerEnv(envName: string, fallback: number): number {
    const value = process.env[envName]?.trim();

    if (!value) {
      return fallback;
    }

    const parsedValue = Number.parseInt(value, 10);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
  }

  private sliceChunk<T>(items: T[], chunkIndex: number, chunkSize: number): T[] {
    const start = chunkIndex * chunkSize;
    return items.slice(start, start + chunkSize);
  }

  private parseInteger(value: string | number): number | null {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value : null;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number.parseInt(value, 10);
      return Number.isInteger(parsedValue) ? parsedValue : null;
    }

    return null;
  }
}
