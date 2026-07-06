import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ScannerMetricsService } from './../src/modules/scanner/scanner-metrics.service';

describe('Scanner check-in sync (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let metrics: ScannerMetricsService;
  const deviceIds: string[] = [];
  const assignmentIds: string[] = [];
  const manifestTicketIds: string[] = [];
  const revokedIds: string[] = [];

  beforeAll(async () => {
    if (process.env.DIRECT_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
    }

    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    metrics = moduleFixture.get(ScannerMetricsService);
    metrics.reset();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (assignmentIds.length > 0) {
      await prisma.checkInEvent.deleteMany({
        where: {
          assignmentId: {
            in: assignmentIds,
          },
        },
      });
    }

    if (revokedIds.length > 0) {
      await prisma.scannerRevokedTicket.deleteMany({
        where: {
          id: {
            in: revokedIds,
          },
        },
      });
    }

    if (manifestTicketIds.length > 0) {
      await prisma.scannerManifestTicket.deleteMany({
        where: {
          id: {
            in: manifestTicketIds,
          },
        },
      });
    }

    if (assignmentIds.length > 0) {
      await prisma.scannerAssignment.deleteMany({
        where: {
          id: {
            in: assignmentIds,
          },
        },
      });
    }

    if (deviceIds.length > 0) {
      await prisma.scannerDevice.deleteMany({
        where: {
          id: {
            in: deviceIds,
          },
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('accepts the first scan and replays the same clientEventId idempotently', async () => {
    const fixture = await createAssignmentFixture('scanner-sync-01');
    const clientEventId = randomUUID();
    const correlationId = `corr-${randomUUID()}`;
    const metricsBefore = metrics.snapshot();

    const payload = {
      assignmentId: fixture.assignmentId,
      manifestVersion: 5,
      events: [
        {
          clientEventId,
          ticketRef: 'ticket-ref-accept',
          rawToken: 'raw-token-accept',
          scannerUserId: fixture.scannerUserId,
          deviceId: fixture.deviceCode,
          eventId: fixture.eventId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
          clientScannedAt: '2026-06-24T10:15:30.000Z',
        },
      ],
    };

    const acceptedResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('x-correlation-id', correlationId)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send(payload);

    expect(acceptedResponse.status).toBe(200);
    expect(acceptedResponse.headers['x-correlation-id']).toBe(correlationId);
    expect(acceptedResponse.body.results).toHaveLength(1);
    expect(acceptedResponse.body.results[0]).toMatchObject({
      clientEventId,
      result: 'accepted',
      reason: 'accepted_first_scan',
      winningEventId: null,
      ticketId: 'ticket-accept',
    });
    const replayResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('x-correlation-id', correlationId)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send(payload);

    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body.results[0]).toMatchObject({
      clientEventId,
      result: 'accepted',
      reason: 'duplicate_event_replay',
      checkInEventId: acceptedResponse.body.results[0].checkInEventId,
      ticketId: 'ticket-accept',
    });

    expect(metrics.snapshot()).toMatchObject({
      accepted: metricsBefore.accepted + 2,
      duplicateReplay: metricsBefore.duplicateReplay + 1,
    });
  });

  it('marks the later valid attempt for the same ticket as conflict', async () => {
    const fixture = await createAssignmentFixture('scanner-sync-02');
    const metricsBefore = metrics.snapshot();

    const firstResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send({
        assignmentId: fixture.assignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-conflict',
            rawToken: 'raw-token-conflict',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:20:30.000Z',
          },
        ],
      });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.results[0].result).toBe('accepted');
    const conflictResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send({
        assignmentId: fixture.assignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-conflict',
            rawToken: 'raw-token-conflict',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:21:30.000Z',
          },
        ],
      });

    expect(conflictResponse.status).toBe(200);
    expect(conflictResponse.body.results[0]).toMatchObject({
      result: 'conflict',
      reason: 'ticket_already_checked_in',
      winningEventId: firstResponse.body.results[0].checkInEventId,
      ticketId: 'ticket-conflict',
    });
    expect(metrics.snapshot()).toMatchObject({
      accepted: metricsBefore.accepted + 1,
      conflict: metricsBefore.conflict + 1,
    });
  });

  it('rejects wrong-zone and revoked tickets with per-event ACK results', async () => {
    const fixture = await createAssignmentFixture('scanner-sync-03');
    const metricsBefore = metrics.snapshot();

    const response = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send({
        assignmentId: fixture.assignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-zone',
            rawToken: 'raw-token-zone',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'GA',
            clientScannedAt: '2026-06-24T10:25:30.000Z',
          },
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-revoked',
            rawToken: 'raw-token-revoked',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:26:30.000Z',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.results).toHaveLength(2);
    expect(response.body.results[0]).toMatchObject({
      result: 'rejected',
      reason: 'wrong_zone',
      ticketId: 'ticket-zone',
    });
    expect(response.body.results[1]).toMatchObject({
      result: 'rejected',
      reason: 'ticket_revoked',
      ticketId: null,
    });

    expect(metrics.snapshot()).toMatchObject({
      rejected: metricsBefore.rejected + 2,
    });
  });

  it('rejects wrong assignment while preserving per-event sync ACK format', async () => {
    const fixture = await createAssignmentFixture('scanner-sync-04');

    const response = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send({
        assignmentId: randomUUID(),
        manifestVersion: 5,
        events: [
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-accept',
            rawToken: 'raw-token-accept',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:30:30.000Z',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.results[0]).toMatchObject({
      result: 'rejected',
      reason: 'invalid_assignment',
      ticketId: 'ticket-accept',
      winningEventId: null,
    });
  });

  it('supports partial batch replay with one replayed event and one newly accepted event', async () => {
    const fixture = await createAssignmentFixture('scanner-sync-05');
    const replayedClientEventId = randomUUID();

    const firstBatchResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send({
        assignmentId: fixture.assignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: replayedClientEventId,
            ticketRef: 'ticket-ref-accept',
            rawToken: 'raw-token-accept',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:35:30.000Z',
          },
        ],
      });

    expect(firstBatchResponse.status).toBe(200);
    const secondBatchResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.deviceCode)
      .set('Authorization', `Bearer scanner:${fixture.scannerUserId}`)
      .send({
        assignmentId: fixture.assignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: replayedClientEventId,
            ticketRef: 'ticket-ref-accept',
            rawToken: 'raw-token-accept',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:35:30.000Z',
          },
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-batch',
            rawToken: 'raw-token-batch',
            scannerUserId: fixture.scannerUserId,
            deviceId: fixture.deviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:36:30.000Z',
          },
        ],
      });

    expect(secondBatchResponse.status).toBe(200);
    expect(secondBatchResponse.body.results).toHaveLength(2);
    expect(secondBatchResponse.body.results[0]).toMatchObject({
      result: 'accepted',
      reason: 'duplicate_event_replay',
      checkInEventId: firstBatchResponse.body.results[0].checkInEventId,
      ticketId: 'ticket-accept',
    });
    expect(secondBatchResponse.body.results[1]).toMatchObject({
      result: 'accepted',
      reason: 'accepted_first_scan',
      ticketId: 'ticket-batch',
      winningEventId: null,
    });
  });

  it('returns one accepted and one conflict when two devices sync the same ticket', async () => {
    const fixture = await createTwoDeviceConflictFixture();

    const firstResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.primaryDeviceCode)
      .set('Authorization', `Bearer scanner:${fixture.primaryScannerUserId}`)
      .send({
        assignmentId: fixture.primaryAssignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-shared',
            rawToken: 'raw-token-shared',
            scannerUserId: fixture.primaryScannerUserId,
            deviceId: fixture.primaryDeviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:40:30.000Z',
          },
        ],
      });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.results[0].result).toBe('accepted');
    const secondResponse = await request(app.getHttpServer())
      .post('/scanner/check-in-sync')
      .set('x-device-id', fixture.secondaryDeviceCode)
      .set('Authorization', `Bearer scanner:${fixture.secondaryScannerUserId}`)
      .send({
        assignmentId: fixture.secondaryAssignmentId,
        manifestVersion: 5,
        events: [
          {
            clientEventId: randomUUID(),
            ticketRef: 'ticket-ref-shared',
            rawToken: 'raw-token-shared',
            scannerUserId: fixture.secondaryScannerUserId,
            deviceId: fixture.secondaryDeviceCode,
            eventId: fixture.eventId,
            gateCode: 'GATE_SYNC',
            zoneCode: 'VIP',
            clientScannedAt: '2026-06-24T10:41:30.000Z',
          },
        ],
      });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.results[0]).toMatchObject({
      result: 'conflict',
      reason: 'ticket_already_checked_in',
      winningEventId: firstResponse.body.results[0].checkInEventId,
      ticketId: 'ticket-shared',
    });
  });

  async function createAssignmentFixture(suffix: string) {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();
    const ticketAcceptRowId = randomUUID();
    const ticketConflictRowId = randomUUID();
    const ticketZoneRowId = randomUUID();
    const ticketBatchRowId = randomUUID();
    const revokedRowId = randomUUID();
    const scannerUserId = `scanner-user-${suffix}`;
    const deviceCode = `device-${deviceId}`;
    const eventId = `event-${suffix}`;
    const concertId = `concert-${suffix}`;

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);
    manifestTicketIds.push(ticketAcceptRowId, ticketConflictRowId, ticketZoneRowId, ticketBatchRowId);
    revokedIds.push(revokedRowId);

    await prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode,
        scannerUserId,
        status: 'active',
      },
    });

    await prisma.scannerAssignment.create({
      data: {
        id: assignmentId,
        deviceId,
        scannerUserId,
        eventId,
        concertId,
        gateCode: 'GATE_SYNC',
        zoneCode: 'VIP',
        status: 'active',
        manifestVersion: 5,
        manifestIssuedAt: new Date('2026-06-24T08:00:00.000Z'),
        manifestExpiresAt: new Date('2026-06-24T20:00:00.000Z'),
      },
    });

    await prisma.scannerManifestTicket.createMany({
      data: [
        {
          id: ticketAcceptRowId,
          assignmentId,
          ticketId: 'ticket-accept',
          ticketRef: 'ticket-ref-accept',
          rawToken: 'raw-token-accept',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
        },
        {
          id: ticketConflictRowId,
          assignmentId,
          ticketId: 'ticket-conflict',
          ticketRef: 'ticket-ref-conflict',
          rawToken: 'raw-token-conflict',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
        },
        {
          id: ticketZoneRowId,
          assignmentId,
          ticketId: 'ticket-zone',
          ticketRef: 'ticket-ref-zone',
          rawToken: 'raw-token-zone',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
        },
        {
          id: ticketBatchRowId,
          assignmentId,
          ticketId: 'ticket-batch',
          ticketRef: 'ticket-ref-batch',
          rawToken: 'raw-token-batch',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
        },
      ],
    });

    await prisma.scannerRevokedTicket.create({
      data: {
        id: revokedRowId,
        assignmentId,
        ticketRef: 'ticket-ref-revoked',
        reason: 'revoked',
        eventId,
        concertId,
        gateCode: 'GATE_SYNC',
        zoneCode: 'VIP',
      },
    });

    return {
      assignmentId,
      scannerUserId,
      deviceCode,
      eventId,
    };
  }

  async function createTwoDeviceConflictFixture() {
    const primaryDeviceId = randomUUID();
    const secondaryDeviceId = randomUUID();
    const primaryAssignmentId = randomUUID();
    const secondaryAssignmentId = randomUUID();
    const primaryTicketRowId = randomUUID();
    const secondaryTicketRowId = randomUUID();
    const primaryScannerUserId = 'scanner-user-primary';
    const secondaryScannerUserId = 'scanner-user-secondary';
    const primaryDeviceCode = `device-${primaryDeviceId}`;
    const secondaryDeviceCode = `device-${secondaryDeviceId}`;
    const eventId = `event-${randomUUID()}`;
    const concertId = `concert-${randomUUID()}`;

    deviceIds.push(primaryDeviceId, secondaryDeviceId);
    assignmentIds.push(primaryAssignmentId, secondaryAssignmentId);
    manifestTicketIds.push(primaryTicketRowId, secondaryTicketRowId);

    await prisma.scannerDevice.createMany({
      data: [
        {
          id: primaryDeviceId,
          deviceCode: primaryDeviceCode,
          scannerUserId: primaryScannerUserId,
          status: 'active',
        },
        {
          id: secondaryDeviceId,
          deviceCode: secondaryDeviceCode,
          scannerUserId: secondaryScannerUserId,
          status: 'active',
        },
      ],
    });

    await prisma.scannerAssignment.createMany({
      data: [
        {
          id: primaryAssignmentId,
          deviceId: primaryDeviceId,
          scannerUserId: primaryScannerUserId,
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
          status: 'active',
          manifestVersion: 5,
          manifestIssuedAt: new Date('2026-06-24T08:00:00.000Z'),
          manifestExpiresAt: new Date('2026-06-24T20:00:00.000Z'),
        },
        {
          id: secondaryAssignmentId,
          deviceId: secondaryDeviceId,
          scannerUserId: secondaryScannerUserId,
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
          status: 'active',
          manifestVersion: 5,
          manifestIssuedAt: new Date('2026-06-24T08:00:00.000Z'),
          manifestExpiresAt: new Date('2026-06-24T20:00:00.000Z'),
        },
      ],
    });

    await prisma.scannerManifestTicket.createMany({
      data: [
        {
          id: primaryTicketRowId,
          assignmentId: primaryAssignmentId,
          ticketId: 'ticket-shared',
          ticketRef: 'ticket-ref-shared',
          rawToken: 'raw-token-shared',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
        },
        {
          id: secondaryTicketRowId,
          assignmentId: secondaryAssignmentId,
          ticketId: 'ticket-shared',
          ticketRef: 'ticket-ref-shared',
          rawToken: 'raw-token-shared',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId,
          concertId,
          gateCode: 'GATE_SYNC',
          zoneCode: 'VIP',
        },
      ],
    });

    return {
      primaryAssignmentId,
      secondaryAssignmentId,
      primaryScannerUserId,
      secondaryScannerUserId,
      primaryDeviceCode,
      secondaryDeviceCode,
      eventId,
    };
  }
});
