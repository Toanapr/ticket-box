import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Scanner assignment (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  const deviceIds: string[] = [];
  const assignmentIds: string[] = [];

  beforeAll(async () => {
    if (process.env.DIRECT_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;
    }

    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
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

  it('rejects request without x-device-id header', async () => {
    const response = await request(app.getHttpServer())
      .get('/scanner/assignment')
      .set('Authorization', 'Bearer scanner:scanner-user-01');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_device_id');
  });

  it('rejects request without scanner bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/scanner/assignment')
      .set('x-device-id', `missing-${randomUUID()}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('scanner_unauthorized');
  });

  it('returns 404 when scanner device does not exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/scanner/assignment')
      .set('x-device-id', `missing-${randomUUID()}`)
      .set('Authorization', 'Bearer scanner:scanner-user-01');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('scanner_device_not_found');
  });

  it('returns the active assignment for an active scanner device', async () => {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();
    const now = new Date();

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);

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
        eventId: 'event-001',
        concertId: 'concert-001',
        gateCode: 'GATE_A',
        zoneCode: 'VIP',
        status: 'active',
        manifestVersion: 7,
        manifestIssuedAt: now,
        manifestExpiresAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      },
    });

    const response = await request(app.getHttpServer())
      .get('/scanner/assignment')
      .set('x-device-id', `device-${deviceId}`)
      .set('Authorization', 'Bearer scanner:scanner-user-01');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      assignmentId,
      deviceId: `device-${deviceId}`,
      scannerUserId: 'scanner-user-01',
      status: 'active',
      eventId: 'event-001',
      concertId: 'concert-001',
      gateCode: 'GATE_A',
      zoneCode: 'VIP',
      manifestVersion: 7,
    });
    expect(typeof response.body.manifestGeneratedAt).toBe('string');
    expect(typeof response.body.manifestExpiresAt).toBe('string');
  });

  it('returns 403 when scanner bearer token user does not match assignment user', async () => {
    const deviceId = randomUUID();
    const assignmentId = randomUUID();

    deviceIds.push(deviceId);
    assignmentIds.push(assignmentId);

    await prisma.scannerDevice.create({
      data: {
        id: deviceId,
        deviceCode: `device-${deviceId}`,
        scannerUserId: 'scanner-user-allowed',
        status: 'active',
      },
    });

    await prisma.scannerAssignment.create({
      data: {
        id: assignmentId,
        deviceId,
        scannerUserId: 'scanner-user-allowed',
        eventId: 'event-002',
        concertId: 'concert-002',
        gateCode: 'GATE_B',
        zoneCode: 'GA',
        status: 'active',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/scanner/assignment')
      .set('x-device-id', `device-${deviceId}`)
      .set('Authorization', 'Bearer scanner:scanner-user-denied');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('scanner_assignment_forbidden');
  });
});
