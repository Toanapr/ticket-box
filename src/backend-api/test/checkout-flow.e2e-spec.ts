import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/app.setup';
import { createWebhookSignature } from './../src/common/utils/webhook-signature.util';
import { InventoryService } from './../src/modules/inventory/inventory.service';
import { PaymentReconciliationService } from './../src/modules/payment/payment-reconciliation.service';
import { MockPaymentProvider } from './../src/modules/payment/providers/mock-payment-provider';
import { RedisService } from './../src/common/cache/redis.service';
import { JwtService } from './../src/modules/auth/jwt.service';

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
  let inventoryService: InventoryService;
  let reconciliationService: PaymentReconciliationService;
  let jwtService: JwtService;
  const ticketTypeIds: string[] = [];
  const userIds: string[] = [];
  const concertIds: string[] = [];
  const organizationId = randomUUID();
  const webhookSecret = 'checkout-e2e-webhook-secret';
  const previousWebhookSecret = process.env.WEBHOOK_SIGNING_SECRET;
  const previousRedisUrl = process.env.REDIS_URL;
  const previousMockPaymentMode = process.env.MOCK_PAYMENT_MODE;
  const previousMockPaymentQueryStatus = process.env.MOCK_PAYMENT_QUERY_STATUS;
  const previousMockPaymentDelayMs = process.env.MOCK_PAYMENT_DELAY_MS;
  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER_TIMEOUT_MS = '50';
    process.env.WEBHOOK_SIGNING_SECRET = webhookSecret;
    process.env.REDIS_URL = 'redis://localhost:6379/15';
    prisma = new PrismaClient();
    await prisma.organization.create({
      data: {
        id: organizationId,
        name: 'Checkout E2E Test Organization',
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = setupApp(moduleFixture.createNestApplication());
    await app.init();
    inventoryService = app.get(InventoryService);
    reconciliationService = app.get(PaymentReconciliationService);
    jwtService = app.get(JwtService);
    const redis = app.get(RedisService);
    try {
      const rateLimitKeys = await redis.keys('rate:*');
      await redis.del(...rateLimitKeys);
    } catch {
      // Redis is optional in tests; the guard falls back to fresh local counters.
    }
  });

  beforeEach(() => {
    delete process.env.MOCK_PAYMENT_MODE;
    delete process.env.MOCK_PAYMENT_QUERY_STATUS;
    delete process.env.MOCK_PAYMENT_DELAY_MS;
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

      await prisma.paymentProviderEvent.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await prisma.idempotencyRecord.deleteMany({
        where: { userId: { in: userIds } },
      });

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
    await prisma.concert.deleteMany({
      where: {
        id: { in: concertIds },
      },
    });

    await prisma.organization.deleteMany({
      where: {
        id: organizationId,
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    });
    await app.close();
    await prisma.$disconnect();
    if (previousWebhookSecret === undefined) {
      delete process.env.WEBHOOK_SIGNING_SECRET;
    } else {
      process.env.WEBHOOK_SIGNING_SECRET = previousWebhookSecret;
    }
    if (previousRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = previousRedisUrl;
    }
    if (previousMockPaymentMode === undefined) {
      delete process.env.MOCK_PAYMENT_MODE;
    } else {
      process.env.MOCK_PAYMENT_MODE = previousMockPaymentMode;
    }
    if (previousMockPaymentQueryStatus === undefined) {
      delete process.env.MOCK_PAYMENT_QUERY_STATUS;
    } else {
      process.env.MOCK_PAYMENT_QUERY_STATUS = previousMockPaymentQueryStatus;
    }
    if (previousMockPaymentDelayMs === undefined) {
      delete process.env.MOCK_PAYMENT_DELAY_MS;
    } else {
      process.env.MOCK_PAYMENT_DELAY_MS = previousMockPaymentDelayMs;
    }
  });

  it('keeps reservation idempotent for duplicate requests', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Idempotency GA',
      zoneCode: 'IDEMP',
      price: '100000.00',
      capacity: 50,
      perUserLimit: 4,
    });

    const userId = await createTestUser();
    const idempotencyKey = randomUUID();
    const body = {
      ticketTypeId: testTicketType.id,
      quantity: 2,
      idempotencyKey,
    };

    const first = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send(body);

    const second = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
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

  it('rate limits reservation spam with Retry-After', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Reservation Spam Limit',
      zoneCode: 'RSL',
      price: '100000.00',
      capacity: 100,
      perUserLimit: 100,
    });

    const userId = await createTestUser();
    const responses = [];

    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(
        await request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', bearerToken(userId))
          .set('x-device-id', `device-${userId}`)
          .set('accept-language', 'vi-VN')
          .send({
            ticketTypeId: testTicketType.id,
            quantity: 1,
            idempotencyKey: randomUUID(),
          }),
      );
    }

    expect(
      responses.slice(0, 10).every((response) => response.status === 201),
    ).toBe(true);
    expect(responses[10].status).toBe(429);
    expect(responses[10].headers['retry-after']).toBeDefined();
    expect(responses[10].body.error).toBe('rate_limited');
  });

  it('completes reservation -> order -> mock success -> issued tickets', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Full Flow CAT',
      zoneCode: 'FLOW',
      price: '250000.00',
      capacity: 20,
      perUserLimit: 5,
    });

    const userId = await createTestUser();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 2,
        idempotencyKey: randomUUID(),
      });

    expect(reservationRes.status).toBe(201);

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.status).toBe('pending_payment');
    expect(orderRes.body.paymentId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(orderRes.body.concertId).toBe(testTicketType.concertId);
    expect(orderRes.body.concertTitle).toBe(
      `Test Concert ${testTicketType.name}`,
    );
    expect(orderRes.body.venue).toBe('E2E Test Venue');
    expect(orderRes.body.ticketTypeId).toBe(testTicketType.id);
    expect(orderRes.body.ticketTypeName).toBe(testTicketType.name);
    expect(orderRes.body.quantity).toBe(2);

    const paymentRes = await request(app.getHttpServer())
      .post('/payments/mock-success')
      .set('Authorization', bearerToken(userId))
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

  it('creates one provider intent and replays the durable response', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Intent Replay',
      zoneCode: 'IREP',
      price: '220000.00',
      capacity: 5,
      perUserLimit: 2,
    });
    const userId = await createTestUser();
    const reservation = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .set('x-forwarded-for', `intent-replay-${userId}`)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });
    const order = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservation.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.body.id },
    });
    const key = randomUUID();

    const first = await request(app.getHttpServer())
      .post(`/payments/${payment.id}/intent`)
      .set('Authorization', bearerToken(userId))
      .set('Idempotency-Key', key);
    const replay = await request(app.getHttpServer())
      .post(`/payments/${payment.id}/intent`)
      .set('Authorization', bearerToken(userId))
      .set('Idempotency-Key', key);

    expect(first.status).toBe(201);
    expect(first.body.status).toBe('pending');
    expect(replay.status).toBe(200);
    expect(replay.body.checkoutUrl).toBe(first.body.checkoutUrl);
    expect(
      await prisma.payment.count({ where: { orderId: order.body.id } }),
    ).toBe(1);
    expect(
      await prisma.idempotencyRecord.count({ where: { userId, key } }),
    ).toBe(1);

    const orderDetail = await request(app.getHttpServer())
      .get(`/orders/${order.body.id}`)
      .set('Authorization', bearerToken(userId));

    expect(orderDetail.status).toBe(200);
    expect(orderDetail.body.paymentId).toBe(payment.id);
    expect(orderDetail.body.concertId).toBe(testTicketType.concertId);
    expect(orderDetail.body.concertTitle).toBe(
      `Test Concert ${testTicketType.name}`,
    );
    expect(orderDetail.body.venue).toBe('E2E Test Venue');
    expect(orderDetail.body.ticketTypeId).toBe(testTicketType.id);
    expect(orderDetail.body.ticketTypeName).toBe(testTicketType.name);
    expect(orderDetail.body.quantity).toBe(1);
    expect(orderDetail.body.payments[0]?.checkoutUrl).toBe(
      first.body.checkoutUrl,
    );
  });

  it('creates one provider intent for concurrent retries with the same idempotency key', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Concurrent Intent Replay',
      zoneCode: 'CIRP',
      price: '221000.00',
      capacity: 5,
      perUserLimit: 2,
    });
    const userId = await createTestUser();
    const reservation = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .set('x-forwarded-for', `concurrent-intent-${userId}`)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });
    const order = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservation.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.body.id },
    });
    const key = randomUUID();
    const mockProvider = app.get(MockPaymentProvider);
    const originalCreateIntent = mockProvider.createIntent.bind(mockProvider);
    const createIntentSpy = jest.spyOn(mockProvider, 'createIntent');
    let releaseProvider!: () => void;
    let markProviderEntered!: () => void;
    const providerGate = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const providerEntered = new Promise<void>((resolve) => {
      markProviderEntered = resolve;
    });
    createIntentSpy.mockImplementation(async (input) => {
      markProviderEntered();
      await providerGate;
      return originalCreateIntent(input);
    });

    try {
      const firstRequest = request(app.getHttpServer())
        .post(`/payments/${payment.id}/intent`)
        .set('Authorization', bearerToken(userId))
        .set('Idempotency-Key', key)
        .then((response) => response);
      await providerEntered;

      const concurrentRetry = await request(app.getHttpServer())
        .post(`/payments/${payment.id}/intent`)
        .set('Authorization', bearerToken(userId))
        .set('Idempotency-Key', key);
      expect(concurrentRetry.status).toBe(202);
      expect(concurrentRetry.body.degraded).toBe(true);
      expect(concurrentRetry.body.reason).toBe('provider_timeout_ambiguous');

      releaseProvider();
      const first = await firstRequest;
      expect(first.status).toBe(201);
      expect(first.body.status).toBe('pending');
      expect(first.body.checkoutUrl).toMatch(
        /^https:\/\/mock-payment\.local\/checkout\//,
      );

      const replay = await request(app.getHttpServer())
        .post(`/payments/${payment.id}/intent`)
        .set('Authorization', bearerToken(userId))
        .set('Idempotency-Key', key);

      expect(replay.status).toBe(200);
      expect(replay.body.checkoutUrl).toBe(first.body.checkoutUrl);
      expect(createIntentSpy).toHaveBeenCalledTimes(1);

      const [persistedPayment, idempotencyRecords] = await Promise.all([
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
        prisma.idempotencyRecord.findMany({ where: { userId, key } }),
      ]);
      expect(persistedPayment.providerIntentId).toBeTruthy();
      expect(persistedPayment.checkoutUrl).toBe(first.body.checkoutUrl);
      expect(idempotencyRecords).toHaveLength(1);
      expect(idempotencyRecords[0]?.status).toBe('succeeded');
    } finally {
      releaseProvider();
      createIntentSpy.mockRestore();
    }
  });

  it('does not create a payment intent for an expired order', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Expired Intent Guard',
      zoneCode: 'EIG',
      price: '225000.00',
      capacity: 5,
      perUserLimit: 2,
    });
    const userId = await createTestUser();
    const reservation = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .set('x-forwarded-for', `expired-intent-${userId}`)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });
    const order = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservation.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.body.id },
    });

    await prisma.reservation.update({
      where: { id: reservation.body.id },
      data: {
        status: 'expired',
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    await prisma.inventoryCounter.update({
      where: { ticketTypeId: testTicketType.id },
      data: { reservedCount: { decrement: 1 } },
    });
    await prisma.userTicketQuota.update({
      where: {
        userId_ticketTypeId: {
          userId,
          ticketTypeId: testTicketType.id,
        },
      },
      data: { reservedCount: { decrement: 1 } },
    });
    await prisma.order.update({
      where: { id: order.body.id },
      data: { status: 'expired' },
    });

    const intent = await request(app.getHttpServer())
      .post(`/payments/${payment.id}/intent`)
      .set('Authorization', bearerToken(userId))
      .set('Idempotency-Key', randomUUID());

    expect(intent.status).toBe(200);
    expect(intent.body.status).toBe('expired');
    expect(intent.body.orderStatus).toBe('expired');
    expect(intent.body.checkoutUrl).toBeNull();

    const persisted = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    expect(persisted.status).toBe('expired');
    expect(persisted.checkoutUrl).toBeNull();
  });

  it('returns terminal payment intent state without creating a new provider intent', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Terminal Intent Guard',
      zoneCode: 'TIG',
      price: '235000.00',
      capacity: 5,
      perUserLimit: 2,
    });
    const userId = await createTestUser();
    const reservation = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .set('x-forwarded-for', `terminal-intent-${userId}`)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });
    const order = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservation.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    await request(app.getHttpServer())
      .post('/payments/mock-success')
      .set('Authorization', bearerToken(userId))
      .send({ orderId: order.body.id });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.body.id },
    });
    const intent = await request(app.getHttpServer())
      .post(`/payments/${payment.id}/intent`)
      .set('Authorization', bearerToken(userId))
      .set('Idempotency-Key', randomUUID());

    expect(intent.status).toBe(200);
    expect(intent.body.status).toBe('succeeded');
    expect(intent.body.orderStatus).toBe('issued');
    expect(intent.body.checkoutUrl).toBeNull();
  });

  it('moves an ambiguous timeout to reconciliation without breaking public reads', async () => {
    process.env.MOCK_PAYMENT_MODE = 'timeout';
    try {
      const testTicketType = await createTestTicketType({
        name: 'Provider Timeout',
        zoneCode: 'PTO',
        price: '230000.00',
        capacity: 5,
        perUserLimit: 2,
      });
      const userId = await createTestUser();
      const reservation = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', bearerToken(userId))
        .send({
          ticketTypeId: testTicketType.id,
          quantity: 1,
          idempotencyKey: randomUUID(),
        });
      const order = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', bearerToken(userId))
        .send({
          reservationId: reservation.body.id,
          idempotencyKey: randomUUID(),
          buyer: testBuyer(userId),
        });
      const payment = await prisma.payment.findFirstOrThrow({
        where: { orderId: order.body.id },
      });

      const [intent, publicRead] = await Promise.all([
        request(app.getHttpServer())
          .post(`/payments/${payment.id}/intent`)
          .set('Authorization', bearerToken(userId))
          .set('Idempotency-Key', randomUUID()),
        request(app.getHttpServer()).get(
          `/concerts/${testTicketType.concertId}`,
        ),
      ]);

      expect(intent.status).toBe(202);
      expect(intent.body.status).toBe('pending_reconciliation');
      expect(intent.body.degraded).toBe(true);
      expect(publicRead.status).toBe(200);
      const persisted = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(persisted.status).toBe('pending_reconciliation');
      expect(persisted.reconciliationAfter).not.toBeNull();
    } finally {
      delete process.env.MOCK_PAYMENT_MODE;
    }
  });

  it('recovers a lost webhook through idempotent reconciliation', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Lost Webhook',
      zoneCode: 'LWH',
      price: '240000.00',
      capacity: 5,
      perUserLimit: 2,
    });
    const userId = await createTestUser();
    const reservation = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });
    const order = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservation.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { orderId: order.body.id },
    });
    await request(app.getHttpServer())
      .post(`/payments/${payment.id}/intent`)
      .set('Authorization', bearerToken(userId))
      .set('Idempotency-Key', randomUUID());
    await prisma.payment.update({
      where: { id: payment.id },
      data: { reconciliationAfter: new Date(Date.now() - 1000) },
    });

    process.env.MOCK_PAYMENT_QUERY_STATUS = 'succeeded';
    try {
      const first = await reconciliationService.runBatch();
      const second = await reconciliationService.runBatch();
      expect(first.processed).toBeGreaterThanOrEqual(1);
      expect(second.processed).toBe(0);
    } finally {
      delete process.env.MOCK_PAYMENT_QUERY_STATUS;
    }

    const persistedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: order.body.id },
      include: { payments: true, tickets: true },
    });
    expect(persistedOrder.status).toBe('issued');
    expect(persistedOrder.payments[0]?.status).toBe('succeeded');
    expect(persistedOrder.tickets).toHaveLength(1);
  });

  it('does not create duplicate tickets on webhook replay', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Webhook Replay',
      zoneCode: 'WHRP',
      price: '300000.00',
      capacity: 10,
      perUserLimit: 3,
    });

    const userId = await createTestUser();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    const providerTxnId = `txn-${randomUUID()}`;
    const webhookBody = {
      orderId: orderRes.body.id,
      provider: 'mock',
      providerTxnId,
      status: 'succeeded',
      payload: { eventType: 'payment.succeeded' },
    };

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/payments/webhook')
        .set(
          'x-webhook-signature',
          createWebhookSignature(webhookSecret, webhookBody),
        )
        .send(webhookBody),
      request(app.getHttpServer())
        .post('/payments/webhook')
        .set(
          'x-webhook-signature',
          createWebhookSignature(webhookSecret, webhookBody),
        )
        .send(webhookBody),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.paymentId).toBe(first.body.paymentId);

    const tickets = await prisma.ticket.findMany({
      where: { orderId: orderRes.body.id },
    });

    expect(tickets).toHaveLength(1);
    expect(
      await prisma.paymentProviderEvent.count({
        where: {
          provider: 'mock',
          providerEventId: `${providerTxnId}:succeeded`,
        },
      }),
    ).toBe(1);

    const [inventory, quota] = await Promise.all([
      prisma.inventoryCounter.findUniqueOrThrow({
        where: { ticketTypeId: testTicketType.id },
      }),
      prisma.userTicketQuota.findUniqueOrThrow({
        where: {
          userId_ticketTypeId: {
            userId,
            ticketTypeId: testTicketType.id,
          },
        },
      }),
    ]);
    expect(inventory.reservedCount).toBe(0);
    expect(inventory.soldCount).toBe(1);
    expect(quota.reservedCount).toBe(0);
    expect(quota.paidCount).toBe(1);
  });

  it('rejects non-mock webhook success when amount does not match', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Webhook Amount Mismatch',
      zoneCode: 'WAM',
      price: '310000.00',
      capacity: 10,
      perUserLimit: 3,
    });
    const userId = await createTestUser();
    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .set('x-forwarded-for', `amount-mismatch-${userId}`)
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });
    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        paymentMethod: 'VNPAY',
        buyer: testBuyer(userId),
      });
    const webhookBody = {
      orderId: orderRes.body.id,
      provider: 'VNPAY',
      providerTxnId: `txn-${randomUUID()}`,
      providerEventId: `event-${randomUUID()}`,
      amount: 1,
      currency: 'VND',
      status: 'succeeded' as const,
      payload: { eventType: 'payment.succeeded' },
    };

    const webhookRes = await request(app.getHttpServer())
      .post('/payments/webhook')
      .set(
        'x-webhook-signature',
        createWebhookSignature(webhookSecret, webhookBody),
      )
      .send(webhookBody);

    expect(webhookRes.status).toBe(409);
    expect(webhookRes.body.error).toBe('payment_amount_mismatch');

    const [event, payment, ticketCount] = await Promise.all([
      prisma.paymentProviderEvent.findUniqueOrThrow({
        where: {
          provider_providerEventId: {
            provider: 'VNPAY',
            providerEventId: webhookBody.providerEventId,
          },
        },
      }),
      prisma.payment.findFirstOrThrow({ where: { orderId: orderRes.body.id } }),
      prisma.ticket.count({ where: { orderId: orderRes.body.id } }),
    ]);
    expect(event.status).toBe('rejected');
    expect(event.errorCode).toBe('payment_amount_mismatch');
    expect(payment.status).toBe('created');
    expect(ticketCount).toBe(0);
  });

  it('rejects provider transaction reuse across different orders', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Webhook Txn Conflict',
      zoneCode: 'WTC',
      price: '320000.00',
      capacity: 10,
      perUserLimit: 3,
    });
    const [firstUserId, secondUserId] = await Promise.all([
      createTestUser(),
      createTestUser(),
    ]);

    async function createVnpayOrder(userId: string) {
      const reservationRes = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', bearerToken(userId))
        .set('x-forwarded-for', `txn-conflict-${userId}`)
        .send({
          ticketTypeId: testTicketType.id,
          quantity: 1,
          idempotencyKey: randomUUID(),
        });
      return request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', bearerToken(userId))
        .send({
          reservationId: reservationRes.body.id,
          idempotencyKey: randomUUID(),
          paymentMethod: 'VNPAY',
          buyer: testBuyer(userId),
        });
    }

    const firstOrder = await createVnpayOrder(firstUserId);
    const secondOrder = await createVnpayOrder(secondUserId);
    const providerTxnId = `txn-${randomUUID()}`;
    const firstWebhookBody = {
      orderId: firstOrder.body.id,
      provider: 'VNPAY',
      providerTxnId,
      providerEventId: `event-${randomUUID()}`,
      amount: 32000000,
      currency: 'VND',
      status: 'succeeded' as const,
      payload: { eventType: 'payment.succeeded' },
    };
    const secondWebhookBody = {
      ...firstWebhookBody,
      orderId: secondOrder.body.id,
      providerEventId: `event-${randomUUID()}`,
    };

    const firstWebhook = await request(app.getHttpServer())
      .post('/payments/webhook')
      .set(
        'x-webhook-signature',
        createWebhookSignature(webhookSecret, firstWebhookBody),
      )
      .send(firstWebhookBody);
    const secondWebhook = await request(app.getHttpServer())
      .post('/payments/webhook')
      .set(
        'x-webhook-signature',
        createWebhookSignature(webhookSecret, secondWebhookBody),
      )
      .send(secondWebhookBody);

    expect(firstWebhook.status).toBe(201);
    expect(secondWebhook.status).toBe(409);
    expect(secondWebhook.body.error).toBe('provider_transaction_conflict');

    const secondEvent = await prisma.paymentProviderEvent.findUniqueOrThrow({
      where: {
        provider_providerEventId: {
          provider: 'VNPAY',
          providerEventId: secondWebhookBody.providerEventId,
        },
      },
    });
    const secondOrderAfter = await prisma.order.findUniqueOrThrow({
      where: { id: secondOrder.body.id },
      include: { payments: true, tickets: true },
    });
    expect(secondEvent.status).toBe('rejected');
    expect(secondEvent.errorCode).toBe('provider_transaction_conflict');
    expect(secondOrderAfter.status).toBe('pending_payment');
    expect(secondOrderAfter.payments[0]?.status).toBe('created');
    expect(secondOrderAfter.tickets).toHaveLength(0);
  });

  it('marks order as failed for failed payment webhook without issuing tickets', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Failed Payment',
      zoneCode: 'FAIL',
      price: '210000.00',
      capacity: 8,
      perUserLimit: 2,
    });

    const userId = await createTestUser();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    const failedWebhookBody = {
      orderId: orderRes.body.id,
      provider: 'mock',
      providerTxnId: `txn-${randomUUID()}`,
      status: 'failed' as const,
      payload: { eventType: 'payment.failed' },
    };
    const failedWebhook = await request(app.getHttpServer())
      .post('/payments/webhook')
      .set(
        'x-webhook-signature',
        createWebhookSignature(webhookSecret, failedWebhookBody),
      )
      .send(failedWebhookBody);

    expect(failedWebhook.status).toBe(201);
    expect(failedWebhook.body.orderStatus).toBe('failed');
    expect(failedWebhook.body.paymentStatus).toBe('failed');
    expect(failedWebhook.body.issuedTicketCount).toBe(0);

    const tickets = await prisma.ticket.findMany({
      where: { orderId: orderRes.body.id },
    });

    expect(tickets).toHaveLength(0);
  });

  it('moves late payment success to refund_required and does not issue tickets', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Late Success',
      zoneCode: 'LATE',
      price: '190000.00',
      capacity: 5,
      perUserLimit: 2,
    });

    const userId = await createTestUser();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    await prisma.reservation.update({
      where: { id: reservationRes.body.id },
      data: {
        status: 'expired',
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await prisma.inventoryCounter.update({
      where: { ticketTypeId: testTicketType.id },
      data: {
        reservedCount: { decrement: 1 },
      },
    });

    await prisma.userTicketQuota.update({
      where: {
        userId_ticketTypeId: {
          userId,
          ticketTypeId: testTicketType.id,
        },
      },
      data: {
        reservedCount: { decrement: 1 },
      },
    });

    await prisma.order.update({
      where: { id: orderRes.body.id },
      data: {
        status: 'expired',
      },
    });

    const lateWebhookBody = {
      orderId: orderRes.body.id,
      provider: 'mock',
      providerTxnId: `txn-${randomUUID()}`,
      status: 'succeeded' as const,
      payload: { eventType: 'payment.succeeded' },
    };
    const webhookRes = await request(app.getHttpServer())
      .post('/payments/webhook')
      .set(
        'x-webhook-signature',
        createWebhookSignature(webhookSecret, lateWebhookBody),
      )
      .send(lateWebhookBody);

    expect(webhookRes.status).toBe(201);
    expect(webhookRes.body.orderStatus).toBe('refund_required');
    expect(webhookRes.body.paymentStatus).toBe('succeeded');
    expect(webhookRes.body.reservationStatus).toBe('expired');
    expect(webhookRes.body.issuedTicketCount).toBe(0);

    const tickets = await prisma.ticket.findMany({
      where: { orderId: orderRes.body.id },
    });

    expect(tickets).toHaveLength(0);
  });

  it('does not let one user exceed quota with parallel requests', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Quota Guard',
      zoneCode: 'QG',
      price: '120000.00',
      capacity: 50,
      perUserLimit: 2,
    });

    const userId = await createTestUser();

    const attempts = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', bearerToken(userId))
          .send({
            ticketTypeId: testTicketType.id,
            quantity: 1,
            idempotencyKey: randomUUID(),
          }),
      ),
    );

    const successCount = attempts.filter(
      (response) => response.status === 201,
    ).length;
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
    const testUserIds = await Promise.all(
      Array.from({ length: 5 }, () => createTestUser()),
    );
    const attempts = await Promise.all(
      testUserIds.map((userId) =>
        request(app.getHttpServer())
          .post('/reservations')
          .set('Authorization', bearerToken(userId))
          .send({
            ticketTypeId: testTicketType.id,
            quantity: 1,
            idempotencyKey: randomUUID(),
          }),
      ),
    );

    const successCount = attempts.filter(
      (response) => response.status === 201,
    ).length;
    expect(successCount).toBe(1);

    const inventory = await prisma.inventoryCounter.findUnique({
      where: {
        ticketTypeId: testTicketType.id,
      },
    });

    expect(
      (inventory?.reservedCount ?? 0) + (inventory?.soldCount ?? 0),
    ).toBeLessThanOrEqual(1);
  });

  it('returns renderable opaque QR token for newly issued ticket', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Renderable QR',
      zoneCode: 'QR1',
      price: '175000.00',
      capacity: 4,
      perUserLimit: 2,
    });

    const userId = await createTestUser();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    await request(app.getHttpServer())
      .post('/payments/mock-success')
      .set('Authorization', bearerToken(userId))
      .send({
        orderId: orderRes.body.id,
      });

    const ticket = await prisma.ticket.findFirstOrThrow({
      where: { orderId: orderRes.body.id },
      orderBy: { sequenceNo: 'asc' },
    });

    const ticketRes = await request(app.getHttpServer())
      .get(`/tickets/${ticket.id}`)
      .set('Authorization', bearerToken(userId));

    expect(ticketRes.status).toBe(200);
    expect(ticketRes.body.concertId).toBe(testTicketType.concertId);
    expect(ticketRes.body.concertTitle).toBe(
      `Test Concert ${testTicketType.name}`,
    );
    expect(ticketRes.body.venue).toBe('E2E Test Venue');
    expect(ticketRes.body.startsAt).toBe('2026-12-01T12:00:00.000Z');
    expect(ticketRes.body.ticketTypeName).toBe(testTicketType.name);
    expect(ticketRes.body.qrCode.mode).toBe('opaque_token');
    expect(ticketRes.body.qrCode.renderable).toBe(true);
    expect(typeof ticketRes.body.qrCode.value).toBe('string');
    expect(ticketRes.body.qrCode.value.length).toBeGreaterThan(10);
  });

  it('expires reservation batch safely when worker reruns', async () => {
    const testTicketType = await createTestTicketType({
      name: 'Expiry Rerun Safe',
      zoneCode: 'EXP1',
      price: '165000.00',
      capacity: 3,
      perUserLimit: 2,
    });

    const userId = await createTestUser();

    const reservationRes = await request(app.getHttpServer())
      .post('/reservations')
      .set('Authorization', bearerToken(userId))
      .send({
        ticketTypeId: testTicketType.id,
        quantity: 1,
        idempotencyKey: randomUUID(),
      });

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', bearerToken(userId))
      .send({
        reservationId: reservationRes.body.id,
        idempotencyKey: randomUUID(),
        buyer: testBuyer(userId),
      });

    await prisma.reservation.update({
      where: { id: reservationRes.body.id },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const firstRun = await inventoryService.expireReservationsBatch();
    expect(firstRun.expiredCount).toBeGreaterThanOrEqual(1);

    const afterFirstRun = await Promise.all([
      prisma.reservation.findUniqueOrThrow({
        where: { id: reservationRes.body.id },
      }),
      prisma.order.findUniqueOrThrow({
        where: { id: orderRes.body.id },
      }),
      prisma.inventoryCounter.findUniqueOrThrow({
        where: { ticketTypeId: testTicketType.id },
      }),
      prisma.userTicketQuota.findUniqueOrThrow({
        where: {
          userId_ticketTypeId: {
            userId,
            ticketTypeId: testTicketType.id,
          },
        },
      }),
    ]);

    const [
      reservationAfterFirstRun,
      orderAfterFirstRun,
      inventoryAfterFirstRun,
      quotaAfterFirstRun,
    ] = afterFirstRun;

    expect(reservationAfterFirstRun.status).toBe('expired');
    expect(orderAfterFirstRun.status).toBe('expired');
    expect(inventoryAfterFirstRun.reservedCount).toBe(0);
    expect(inventoryAfterFirstRun.soldCount).toBe(0);
    expect(quotaAfterFirstRun.reservedCount).toBe(0);
    expect(quotaAfterFirstRun.paidCount).toBe(0);

    const secondRun = await inventoryService.expireReservationsBatch();
    expect(secondRun.expiredCount).toBeGreaterThanOrEqual(0);

    const [
      reservationAfterSecondRun,
      orderAfterSecondRun,
      inventoryAfterSecondRun,
      quotaAfterSecondRun,
    ] = await Promise.all([
      prisma.reservation.findUniqueOrThrow({
        where: { id: reservationRes.body.id },
      }),
      prisma.order.findUniqueOrThrow({
        where: { id: orderRes.body.id },
      }),
      prisma.inventoryCounter.findUniqueOrThrow({
        where: { ticketTypeId: testTicketType.id },
      }),
      prisma.userTicketQuota.findUniqueOrThrow({
        where: {
          userId_ticketTypeId: {
            userId,
            ticketTypeId: testTicketType.id,
          },
        },
      }),
    ]);

    expect(reservationAfterSecondRun.status).toBe('expired');
    expect(orderAfterSecondRun.status).toBe('expired');
    expect(inventoryAfterSecondRun.reservedCount).toBe(
      inventoryAfterFirstRun.reservedCount,
    );
    expect(inventoryAfterSecondRun.soldCount).toBe(
      inventoryAfterFirstRun.soldCount,
    );
    expect(quotaAfterSecondRun.reservedCount).toBe(
      quotaAfterFirstRun.reservedCount,
    );
    expect(quotaAfterSecondRun.paidCount).toBe(quotaAfterFirstRun.paidCount);
  });

  it('rejects webhook with invalid signature when signing secret is configured', async () => {
    const previousSecret = process.env.WEBHOOK_SIGNING_SECRET;
    process.env.WEBHOOK_SIGNING_SECRET = 'test-secret';

    try {
      const testTicketType = await createTestTicketType({
        name: 'Signed Webhook',
        zoneCode: 'SIG1',
        price: '155000.00',
        capacity: 4,
        perUserLimit: 2,
      });

      const userId = await createTestUser();

      const reservationRes = await request(app.getHttpServer())
        .post('/reservations')
        .set('Authorization', bearerToken(userId))
        .set('x-forwarded-for', `sig-test-${userId}`)
        .set('x-device-id', `sig-device-${userId}`)
        .set('accept-language', 'vi-VN')
        .send({
          ticketTypeId: testTicketType.id,
          quantity: 1,
          idempotencyKey: randomUUID(),
        });
      expect(reservationRes.status).toBe(201);

      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', bearerToken(userId))
        .send({
          reservationId: reservationRes.body.id,
          idempotencyKey: randomUUID(),
          buyer: testBuyer(userId),
        });
      expect(orderRes.status).toBe(201);

      const payload = {
        orderId: orderRes.body.id,
        provider: 'mock',
        providerTxnId: `txn-${randomUUID()}`,
        status: 'succeeded',
        payload: { eventType: 'payment.succeeded' },
      } as const;

      const invalidSignatureRes = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set('x-webhook-signature', 'invalid-signature')
        .send(payload);

      expect(invalidSignatureRes.status).toBe(401);

      const validSignatureRes = await request(app.getHttpServer())
        .post('/payments/webhook')
        .set(
          'x-webhook-signature',
          createWebhookSignature('test-secret', payload),
        )
        .send(payload);

      expect(validSignatureRes.status).toBe(201);
    } finally {
      if (previousSecret === undefined) {
        delete process.env.WEBHOOK_SIGNING_SECRET;
      } else {
        process.env.WEBHOOK_SIGNING_SECRET = previousSecret;
      }
    }
  });
  async function createTestUser() {
    const userId = randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        email: `checkout-${userId}@test.local`,
        role: 'audience',
        passwordHash: 'e2e-test-password-hash',
        status: 'active',
      },
    });

    userIds.push(userId);

    return userId;
  }

  function bearerToken(userId: string): string {
    return `Bearer ${jwtService.sign({
      sub: userId,
      email: `checkout-${userId}@test.local`,
      role: 'audience',
      organizationId: null,
    })}`;
  }

  function testBuyer(userId: string) {
    return {
      fullName: 'Checkout E2E Buyer',
      phone: '0900000000',
      email: `ticket-${userId}@test.local`,
    };
  }

  async function createTestTicketType(
    input: Omit<TestTicketType, 'id' | 'concertId'>,
  ) {
    const id = randomUUID();
    const concertId = randomUUID();
    ticketTypeIds.push(id);
    concertIds.push(concertId);
    // Phải tạo concert trước vì ticket_types.concert_id
    // là khóa ngoại tham chiếu đến concerts.id
    await prisma.concert.create({
      data: {
        id: concertId,
        slug: `test-concert-${concertId}`,
        organizationId,
        title: `Test Concert ${input.name}`,
        venue: 'E2E Test Venue',
        artistName: 'E2E Test Artist',
        description: 'Concert used for checkout E2E test',
        startAt: new Date('2026-12-01T12:00:00.000Z'),
        status: 'published',
        seatingMapObjectKey: `test/${concertId}/seating-map.json`,
        publishedArtistBio: 'E2E test artist biography',
      },
    });
    await prisma.ticketType.create({
      data: {
        id,
        concertId,
        slug: input.zoneCode.toLowerCase(),
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
