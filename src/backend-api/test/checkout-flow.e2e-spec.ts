import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';

type TestTicketType = {
  id: string;
  concertId: string;
  name: string;
  zoneCode: string;
  price: string;
  capacity: number;
  perUserLimit: number;
};

describe('Checkout flow and invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  const ticketTypeIds: string[] = [];
  const concertIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (ticketTypeIds.length > 0) {
      const orderItems = await prisma.orderItem.findMany({
        where: {
          ticketTypeId: { in: ticketTypeIds },
        },
        select: {
          orderId: true,
        },
      });

      const orderIds = [...new Set(orderItems.map((item) => item.orderId))];

      await prisma.ticket.deleteMany({
        where: {
          ticketTypeId: { in: ticketTypeIds },
        },
      });
      await prisma.payment.deleteMany({
        where: {
          orderId: { in: orderIds },
        },
      });
      await prisma.orderItem.deleteMany({
        where: {
          ticketTypeId: { in: ticketTypeIds },
        },
      });
      await prisma.reservation.deleteMany({
        where: {
          ticketTypeId: { in: ticketTypeIds },
        },
      });
      await prisma.userTicketQuota.deleteMany({
        where: {
          ticketTypeId: { in: ticketTypeIds },
        },
      });
      await prisma.order.deleteMany({
        where: {
          id: { in: orderIds },
        },
      });
      await prisma.inventoryCounter.deleteMany({
        where: {
          ticketTypeId: { in: ticketTypeIds },
        },
      });
      await prisma.ticketType.deleteMany({
        where: {
          id: { in: ticketTypeIds },
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('keeps reservation idempotent for duplicate requests', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Idempotency GA',
      zoneCode: 'IDEMP',
      price: '100000.00',
      capacity: 50,
      perUserLimit: 4,
    });

    const userId = randomUUID();
    const idempotencyKey = randomUUID();
    const body = {
      ticketTypeId: testTicketType.id,
      quantity: 2,
      idempotencyKey,
    };

    const first = await request(app.getHttpServer())
      .post('/reservations')
      .set('x-user-id', userId)
      .send(body);

    const second = await request(app.getHttpServer())
      .post('/reservations')
      .set('x-user-id', userId)
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);

    const reservations = await prisma.reservation.findMany({
      where: {
        userId,
        ticketTypeId: testTicketType.id,
      },
    });

    expect(reservations).toHaveLength(1);
  });

  it('completes reservation -> order -> mock success -> issued tickets', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Full Flow CAT',
      zoneCode: 'FLOW',
      price: '250000.00',
      capacity: 20,
      perUserLimit: 5,
    });

    const userId = randomUUID();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('x-user-id', userId)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 2,
        idempotencyKey: randomUUID(),
      });

    expect(reservationRes.status).toBe(201);

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('x-user-id', userId)
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.status).toBe('pending_payment');

    const paymentRes = await request(app.getHttpServer())
      .post('/payments/mock-success')
      .set('x-user-id', userId)
      .send({
        orderId: orderRes.body.id,
      });

    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.orderStatus).toBe('issued');
    expect(paymentRes.body.paymentStatus).toBe('succeeded');
    expect(paymentRes.body.reservationStatus).toBe('confirmed');
    expect(paymentRes.body.issuedTicketCount).toBe(2);

    const order = await prisma.order.findUnique({
      where: { id: orderRes.body.id },
      include: {
        payments: true,
        reservations: true,
        tickets: true,
      },
    });

    expect(order?.status).toBe('issued');
    expect(order?.payments[0]?.status).toBe('succeeded');
    expect(order?.reservations[0]?.status).toBe('confirmed');
    expect(order?.tickets).toHaveLength(2);
  });

  it('does not create duplicate tickets on webhook replay', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Webhook Replay',
      zoneCode: 'WHRP',
      price: '300000.00',
      capacity: 10,
      perUserLimit: 3,
    });

    const userId = randomUUID();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('x-user-id', userId)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('x-user-id', userId)
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
      });

    const providerTxnId = `txn-${randomUUID()}`;
    const webhookBody = {
      orderId: orderRes.body.id,
      provider: 'mock',
      providerTxnId,
      status: 'succeeded',
      payload: { eventType: 'payment.succeeded' },
    };

    const first = await request(app.getHttpServer())
      .post('/payments/webhook')
      .send(webhookBody);

    const second = await request(app.getHttpServer())
      .post('/payments/webhook')
      .send(webhookBody);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.paymentId).toBe(first.body.paymentId);

    const tickets = await prisma.ticket.findMany({
      where: { orderId: orderRes.body.id },
    });

    expect(tickets).toHaveLength(1);
  });

  it('does not let one user exceed quota with parallel requests', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Quota Guard',
      zoneCode: 'QG',
      price: '120000.00',
      capacity: 50,
      perUserLimit: 2,
    });

    const userId = randomUUID();

    const attempts = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/reservations')
          .set('x-user-id', userId)
          .send({
            ticketTypeId: testTicketType.id,
            quantity: 1,
            idempotencyKey: randomUUID(),
          }),
      ),
    );

    const successCount = attempts.filter((response) => response.status === 201).length;
    expect(successCount).toBe(2);

    const quota = await prisma.userTicketQuota.findUnique({
      where: {
        userId_ticketTypeId: {
          userId,
          ticketTypeId: testTicketType.id,
        },
      },
    });

    expect(quota?.reservedCount ?? 0).toBeLessThanOrEqual(2);
    expect(quota?.paidCount ?? 0).toBe(0);
  });

  it('does not oversell the last available ticket under concurrent requests', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Last Ticket Contention',
      zoneCode: 'LAST1',
      price: '500000.00',
      capacity: 1,
      perUserLimit: 1,
    });

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/reservations')
          .set('x-user-id', randomUUID())
          .send({
            ticketTypeId: testTicketType.id,
            quantity: 1,
            idempotencyKey: randomUUID(),
          }),
      ),
    );

    const successCount = attempts.filter((response) => response.status === 201).length;
    expect(successCount).toBe(1);

    const inventory = await prisma.inventoryCounter.findUnique({
      where: {
        ticketTypeId: testTicketType.id,
      },
    });

    expect((inventory?.reservedCount ?? 0) + (inventory?.soldCount ?? 0)).toBeLessThanOrEqual(1);
  });

  async function createTestTicketType(input: Omit<TestTicketType, 'id' | 'concertId'>) {
    const id = randomUUID();
    const concertId = randomUUID();
    ticketTypeIds.push(id);
    concertIds.push(concertId);

    await prisma.ticketType.create({
      data: {
        id,
        concertId,
        zoneCode: input.zoneCode,
        name: input.name,
        price: input.price,
        capacity: input.capacity,
        perUserLimit: input.perUserLimit,
        saleStartAt: new Date('2026-01-01T00:00:00.000Z'),
        saleEndAt: new Date('2027-01-01T00:00:00.000Z'),
      },
    });

    await prisma.inventoryCounter.create({
      data: {
        ticketTypeId: id,
        totalCapacity: input.capacity,
        reservedCount: 0,
        soldCount: 0,
        version: 0,
      },
    });

    return {
      id,
      concertId,
      ...input,
    };
  }
});
