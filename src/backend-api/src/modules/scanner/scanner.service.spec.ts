import { CheckInResultStatus } from '@prisma/client';
import { GuestListImportService } from '../guest-list/guest-list-import.service';
import { ScannerLoggerService } from './scanner-logger.service';
import { ScannerMetricsService } from './scanner-metrics.service';
import { ScannerRepository } from './scanner.repository';
import { ScannerService } from './scanner.service';

describe('ScannerService guest QR support', () => {
  const scannerRepository = {
    findDeviceWithActiveAssignments: jest.fn(),
    isDeviceActive: jest.fn(),
    findManifestPayloadByAssignmentId: jest.fn(),
    recordCheckInAttempt: jest.fn(),
  } as unknown as jest.Mocked<ScannerRepository>;

  const scannerLogger = {
    log: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<ScannerLoggerService>;

  const scannerMetrics = {
    incrementResult: jest.fn(),
    incrementDuplicateReplay: jest.fn(),
    snapshot: jest.fn(() => ({
      accepted: 0,
      conflict: 0,
      rejected: 0,
      duplicateReplay: 0,
    })),
  } as unknown as jest.Mocked<ScannerMetricsService>;

  const guestListImportService = {
    getScannerManifest: jest.fn(),
  } as unknown as jest.Mocked<GuestListImportService>;

  const service = new ScannerService(
    scannerRepository,
    scannerLogger,
    scannerMetrics,
    guestListImportService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    scannerRepository.isDeviceActive.mockReturnValue(true);
    scannerRepository.findDeviceWithActiveAssignments.mockResolvedValue({
      id: 'device-row-1',
      deviceCode: 'device-guest-01',
      scannerUserId: 'scanner-user-guest',
      status: 'active',
      assignments: [
        {
          id: 'assignment-guest-01',
          deviceId: 'device-row-1',
          scannerUserId: 'scanner-user-guest',
          eventId: 'event-guest-01',
          concertId: 'concert-guest-01',
          gateCode: 'GATE_GUEST',
          zoneCode: 'GUEST-LIST',
          status: 'active',
          manifestVersion: 7,
          manifestIssuedAt: new Date('2026-07-08T08:00:00.000Z'),
          manifestExpiresAt: new Date('2026-07-08T20:00:00.000Z'),
          updatedAt: new Date('2026-07-08T08:00:00.000Z'),
        },
      ],
    } as never);
    scannerRepository.findManifestPayloadByAssignmentId.mockResolvedValue({
      id: 'assignment-guest-01',
      eventId: 'event-guest-01',
      concertId: 'concert-guest-01',
      gateCode: 'GATE_GUEST',
      zoneCode: 'GUEST-LIST',
      manifestVersion: 7,
      manifestIssuedAt: new Date('2026-07-08T08:00:00.000Z'),
      manifestExpiresAt: new Date('2026-07-08T20:00:00.000Z'),
      updatedAt: new Date('2026-07-08T08:00:00.000Z'),
      manifestTickets: [],
      revokedTickets: [],
      guestEntries: [],
    } as never);
    guestListImportService.getScannerManifest.mockResolvedValue({
      concertId: 'concert-guest-01',
      guestList: {
        versionId: 'version-guest-01',
        versionNo: 2,
        checksum: 'checksum-guest-01',
        generatedAt: '2026-07-08T08:00:00.000Z',
        entries: [
          {
            id: 'guest-entry-01',
            guestRef: 'guest:guest-entry-01',
            fullName: 'Guest QR One',
            email: 'guest.one@example.com',
            phone: null,
            sponsorId: null,
            identityKey: 'email:guest.one@example.com',
            zoneCode: 'GUEST-LIST',
            ticketTypeId: null,
          },
        ],
      },
    } as never);
  });

  it('adds active guest list entries into the scanner manifest for guest zone assignments', async () => {
    const result = await service.getManifest('device-guest-01', 'scanner-user-guest', {});

    expect(result.totalGuestEntries).toBe(1);
    expect(result.guestList).toEqual([
      {
        guestRef: 'guest:guest-entry-01',
        displayName: 'Guest QR One',
        eventId: 'event-guest-01',
        gateCode: 'GATE_GUEST',
        zoneCode: 'GUEST-LIST',
      },
    ]);
  });

  it('accepts guest QR sync events using guestRef from the active guest list', async () => {
    scannerRepository.recordCheckInAttempt.mockResolvedValue({
      replayed: false,
      event: {
        id: 'checkin-guest-01',
        clientEventId: '11111111-1111-4111-8111-111111111111',
        result: CheckInResultStatus.accepted,
        reason: 'accepted_first_scan',
        serverRecordedAt: new Date('2026-07-08T09:00:00.000Z'),
        winningEventId: null,
        ticketId: null,
      },
    } as never);

    const result = await service.syncCheckIns(
      'device-guest-01',
      'scanner-user-guest',
      {
        assignmentId: 'assignment-guest-01',
        manifestVersion: 7,
        events: [
          {
            clientEventId: '11111111-1111-4111-8111-111111111111',
            ticketRef: 'guest:guest-entry-01',
            rawToken: 'guest:guest-entry-01',
            scannerUserId: 'scanner-user-guest',
            deviceId: 'device-guest-01',
            eventId: 'event-guest-01',
            gateCode: 'GATE_GUEST',
            zoneCode: 'GUEST-LIST',
            clientScannedAt: '2026-07-08T09:00:00.000Z',
          },
        ],
      },
      'corr-guest-01',
    );

    expect(scannerRepository.recordCheckInAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: null,
        ticketRef: 'guest:guest-entry-01',
        rejectionReason: undefined,
      }),
    );
    expect(result.results[0]).toMatchObject({
      result: 'accepted',
      reason: 'accepted_first_scan',
      ticketId: null,
    });
  });
});
