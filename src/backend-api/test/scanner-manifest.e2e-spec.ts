import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { signScannerManifest } from './../src/modules/scanner/scanner-manifest-signature.util';

describe('Scanner manifest (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  const deviceIds: string[] = [];
  const assignmentIds: string[] = [];
  const manifestTicketIds: string[] = [];
  const revokedIds: string[] = [];
  const guestIds: string[] = [];

  beforeAll(async () => {
    if (process.env.DIRECT_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
    }

    process.env.SCANNER_MANIFEST_SIGNING_SECRET = 'scanner-manifest-test-secret';
    process.env.SCANNER_MANIFEST_MAX_FULL_ENTRIES = '3';
    process.env.SCANNER_MANIFEST_DEFAULT_CHUNK_SIZE = '2';
    process.env.SCANNER_MANIFEST_MAX_CHUNK_SIZE = '2';

    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (guestIds.length > 0) {
      await prisma.scannerGuestEntry.deleteMany({
        where: { id: { in: guestIds } },
      });
    }

    if (revokedIds.length > 0) {
      await prisma.scannerRevokedTicket.deleteMany({
        where: { id: { in: revokedIds } },
      });
    }

    if (manifestTicketIds.length > 0) {
      await prisma.scannerManifestTicket.deleteMany({
        where: { id: { in: manifestTicketIds } },
      });
    }

    if (assignmentIds.length > 0) {
      await prisma.scannerAssignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });
    }

    if (deviceIds.length > 0) {
      await prisma.scannerDevice.deleteMany({
        where: { id: { in: deviceIds } },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('returns a signed manifest for the active assignment scope', async () => {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();
    const ticketRowId = randomUUID();
    const revokedRowId = randomUUID();
    const guestRowId = randomUUID();
    const issuedAt = new Date('2026-06-24T08:00:00.000Z');
    const expiresAt = new Date('2026-06-24T20:00:00.000Z');

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);
    manifestTicketIds.push(ticketRowId);
    revokedIds.push(revokedRowId);
    guestIds.push(guestRowId);

    await prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode: `device-${deviceId}`,
        scannerUserId: 'scanner-user-01',
        status: 'active',
      },
    });

    await prisma.scannerAssignment.create({
      data: {
        id: assignmentId,
        deviceId,
        scannerUserId: 'scanner-user-01',
        eventId: 'event-100',
        concertId: 'concert-100',
        gateCode: 'GATE_A',
        zoneCode: 'VIP',
        status: 'active',
        manifestVersion: 3,
        manifestIssuedAt: issuedAt,
        manifestExpiresAt: expiresAt,
      },
    });

    await prisma.scannerManifestTicket.create({
      data: {
        id: ticketRowId,
        assignmentId,
        ticketId: 'ticket-100',
        ticketRef: 'ticket-ref-100',
        rawToken: 'opaque-ticket-token-100',
        ticketTypeId: 'vip-ticket',
        status: 'issued',
        eventId: 'event-100',
        concertId: 'concert-100',
        gateCode: 'GATE_A',
        zoneCode: 'VIP',
      },
    });

    await prisma.scannerRevokedTicket.create({
      data: {
        id: revokedRowId,
        assignmentId,
        ticketRef: 'ticket-ref-revoked',
        reason: 'revoked',
        eventId: 'event-100',
        concertId: 'concert-100',
        gateCode: 'GATE_A',
        zoneCode: 'VIP',
      },
    });

    await prisma.scannerGuestEntry.create({
      data: {
        id: guestRowId,
        assignmentId,
        guestRef: 'guest-100',
        displayName: 'Nguyen Van B',
        eventId: 'event-100',
        concertId: 'concert-100',
        gateCode: 'GATE_A',
        zoneCode: 'VIP',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/scanner/manifest')
      .set('x-device-id', `device-${deviceId}`)
      .set('Authorization', 'Bearer scanner:scanner-user-01');

    expect(response.status).toBe(200);
    expect(response.body.assignmentId).toBe(assignmentId);
    expect(response.body.version).toBe(3);
    expect(response.body.chunkIndex).toBeNull();
    expect(response.body.chunkSize).toBeNull();
    expect(response.body.totalChunks).toBe(1);
    expect(response.body.totalTickets).toBe(1);
    expect(response.body.totalRevokedTickets).toBe(1);
    expect(response.body.totalGuestEntries).toBe(1);
    expect(response.body.isChunked).toBe(false);
    expect(response.body.tickets).toHaveLength(1);
    expect(response.body.revokedTickets).toHaveLength(1);
    expect(response.body.guestList).toHaveLength(1);

    const expectedSignature = signScannerManifest('scanner-manifest-test-secret', {
      assignmentId,
      eventId: 'event-100',
      concertId: 'concert-100',
      gateCode: 'GATE_A',
      zoneCode: 'VIP',
      version: 3,
      generatedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      chunkIndex: null,
      chunkSize: null,
      totalChunks: 1,
      totalTickets: 1,
      totalRevokedTickets: 1,
      totalGuestEntries: 1,
      isChunked: false,
      tickets: [
        {
          ticketRef: 'ticket-ref-100',
          rawToken: 'opaque-ticket-token-100',
          ticketId: 'ticket-100',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-100',
          gateCode: 'GATE_A',
          zoneCode: 'VIP',
        },
      ],
      revokedTickets: [
        {
          ticketRef: 'ticket-ref-revoked',
          reason: 'revoked',
        },
      ],
      guestList: [
        {
          guestRef: 'guest-100',
          displayName: 'Nguyen Van B',
          eventId: 'event-100',
          gateCode: 'GATE_A',
          zoneCode: 'VIP',
        },
      ],
    });

    expect(response.body.signature).toBe(expectedSignature);
  });

  it('returns 403 when requested assignmentId does not match active assignment', async () => {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);

    await prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode: `device-${deviceId}`,
        scannerUserId: 'scanner-user-02',
        status: 'active',
      },
    });

    await prisma.scannerAssignment.create({
      data: {
        id: assignmentId,
        deviceId,
        scannerUserId: 'scanner-user-02',
        eventId: 'event-200',
        concertId: 'concert-200',
        gateCode: 'GATE_B',
        zoneCode: 'GA',
        status: 'active',
        manifestVersion: 1,
        manifestIssuedAt: new Date('2026-06-24T08:00:00.000Z'),
        manifestExpiresAt: new Date('2026-06-24T20:00:00.000Z'),
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/scanner/manifest?assignmentId=${randomUUID()}`)
      .set('x-device-id', `device-${deviceId}`)
      .set('Authorization', 'Bearer scanner:scanner-user-02');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('scanner_manifest_forbidden');
  });

  it('requires chunking when manifest entry count exceeds full download limit', async () => {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();
    const ticketRowIds = [randomUUID(), randomUUID()];
    const revokedRowId = randomUUID();
    const guestRowId = randomUUID();

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);
    manifestTicketIds.push(...ticketRowIds);
    revokedIds.push(revokedRowId);
    guestIds.push(guestRowId);

    await prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode: `device-${deviceId}`,
        scannerUserId: 'scanner-user-03',
        status: 'active',
      },
    });

    await prisma.scannerAssignment.create({
      data: {
        id: assignmentId,
        deviceId,
        scannerUserId: 'scanner-user-03',
        eventId: 'event-300',
        concertId: 'concert-300',
        gateCode: 'GATE_C',
        zoneCode: 'VIP',
        status: 'active',
        manifestVersion: 9,
        manifestIssuedAt: new Date('2026-06-24T08:00:00.000Z'),
        manifestExpiresAt: new Date('2026-06-24T20:00:00.000Z'),
      },
    });

    await prisma.scannerManifestTicket.createMany({
      data: [
        {
          id: ticketRowIds[0],
          assignmentId,
          ticketId: 'ticket-301',
          ticketRef: 'ticket-ref-301',
          rawToken: 'raw-token-301',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-300',
          concertId: 'concert-300',
          gateCode: 'GATE_C',
          zoneCode: 'VIP',
        },
        {
          id: ticketRowIds[1],
          assignmentId,
          ticketId: 'ticket-302',
          ticketRef: 'ticket-ref-302',
          rawToken: 'raw-token-302',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-300',
          concertId: 'concert-300',
          gateCode: 'GATE_C',
          zoneCode: 'VIP',
        },
      ],
    });

    await prisma.scannerRevokedTicket.create({
      data: {
        id: revokedRowId,
        assignmentId,
        ticketRef: 'ticket-ref-revoked-300',
        reason: 'revoked',
        eventId: 'event-300',
        concertId: 'concert-300',
        gateCode: 'GATE_C',
        zoneCode: 'VIP',
      },
    });

    await prisma.scannerGuestEntry.create({
      data: {
        id: guestRowId,
        assignmentId,
        guestRef: 'guest-300',
        displayName: 'Guest C',
        eventId: 'event-300',
        concertId: 'concert-300',
        gateCode: 'GATE_C',
        zoneCode: 'VIP',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/scanner/manifest')
      .set('x-device-id', `device-${deviceId}`)
      .set('Authorization', 'Bearer scanner:scanner-user-03');

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('scanner_manifest_requires_chunking');
    expect(response.body.totalEntries).toBe(4);
    expect(response.body.recommendedChunkSize).toBe(2);
  });

  it('returns a chunked manifest slice when chunk query is provided', async () => {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();
    const ticketRowIds = [randomUUID(), randomUUID(), randomUUID()];
    const revokedRowId = randomUUID();
    const guestRowId = randomUUID();
    const issuedAt = new Date('2026-06-24T08:00:00.000Z');
    const expiresAt = new Date('2026-06-24T20:00:00.000Z');

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);
    manifestTicketIds.push(...ticketRowIds);
    revokedIds.push(revokedRowId);
    guestIds.push(guestRowId);

    await prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode: `device-${deviceId}`,
        scannerUserId: 'scanner-user-04',
        status: 'active',
      },
    });

    await prisma.scannerAssignment.create({
      data: {
        id: assignmentId,
        deviceId,
        scannerUserId: 'scanner-user-04',
        eventId: 'event-400',
        concertId: 'concert-400',
        gateCode: 'GATE_D',
        zoneCode: 'VIP',
        status: 'active',
        manifestVersion: 12,
        manifestIssuedAt: issuedAt,
        manifestExpiresAt: expiresAt,
      },
    });

    await prisma.scannerManifestTicket.createMany({
      data: [
        {
          id: ticketRowIds[0],
          assignmentId,
          ticketId: 'ticket-401',
          ticketRef: 'ticket-ref-401',
          rawToken: 'raw-token-401',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-400',
          concertId: 'concert-400',
          gateCode: 'GATE_D',
          zoneCode: 'VIP',
        },
        {
          id: ticketRowIds[1],
          assignmentId,
          ticketId: 'ticket-402',
          ticketRef: 'ticket-ref-402',
          rawToken: 'raw-token-402',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-400',
          concertId: 'concert-400',
          gateCode: 'GATE_D',
          zoneCode: 'VIP',
        },
        {
          id: ticketRowIds[2],
          assignmentId,
          ticketId: 'ticket-403',
          ticketRef: 'ticket-ref-403',
          rawToken: 'raw-token-403',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-400',
          concertId: 'concert-400',
          gateCode: 'GATE_D',
          zoneCode: 'VIP',
        },
      ],
    });

    await prisma.scannerRevokedTicket.create({
      data: {
        id: revokedRowId,
        assignmentId,
        ticketRef: 'ticket-ref-revoked-400',
        reason: 'revoked',
        eventId: 'event-400',
        concertId: 'concert-400',
        gateCode: 'GATE_D',
        zoneCode: 'VIP',
      },
    });

    await prisma.scannerGuestEntry.create({
      data: {
        id: guestRowId,
        assignmentId,
        guestRef: 'guest-400',
        displayName: 'Guest D',
        eventId: 'event-400',
        concertId: 'concert-400',
        gateCode: 'GATE_D',
        zoneCode: 'VIP',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/scanner/manifest?chunkIndex=1&chunkSize=2')
      .set('x-device-id', `device-${deviceId}`)
      .set('Authorization', 'Bearer scanner:scanner-user-04');

    expect(response.status).toBe(200);
    expect(response.body.assignmentId).toBe(assignmentId);
    expect(response.body.isChunked).toBe(true);
    expect(response.body.chunkIndex).toBe(1);
    expect(response.body.chunkSize).toBe(2);
    expect(response.body.totalChunks).toBe(2);
    expect(response.body.totalTickets).toBe(3);
    expect(response.body.totalRevokedTickets).toBe(1);
    expect(response.body.totalGuestEntries).toBe(1);
    expect(response.body.tickets).toHaveLength(1);
    expect(response.body.tickets[0].ticketRef).toBe('ticket-ref-403');
    expect(response.body.revokedTickets).toHaveLength(0);
    expect(response.body.guestList).toHaveLength(0);

    const expectedSignature = signScannerManifest('scanner-manifest-test-secret', {
      assignmentId,
      eventId: 'event-400',
      concertId: 'concert-400',
      gateCode: 'GATE_D',
      zoneCode: 'VIP',
      version: 12,
      generatedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      chunkIndex: 1,
      chunkSize: 2,
      totalChunks: 2,
      totalTickets: 3,
      totalRevokedTickets: 1,
      totalGuestEntries: 1,
      isChunked: true,
      tickets: [
        {
          ticketRef: 'ticket-ref-403',
          rawToken: 'raw-token-403',
          ticketId: 'ticket-403',
          ticketTypeId: 'vip-ticket',
          status: 'issued',
          eventId: 'event-400',
          gateCode: 'GATE_D',
          zoneCode: 'VIP',
        },
      ],
      revokedTickets: [],
      guestList: [],
    });

    expect(response.body.signature).toBe(expectedSignature);
  });
});
