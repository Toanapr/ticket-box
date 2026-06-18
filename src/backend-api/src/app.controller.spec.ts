import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationService } from './notification.service';
import { PrismaService } from './prisma.service';

describe('AppController', () => {
  let app: INestApplication;
  let appController: AppController;
  const role = 'organizer';
  const organizationId = `org-test-${Date.now()}`;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, NotificationService, PrismaService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    appController = app.get<AppController>(AppController);
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates and updates a concert and ticket type for audience listing', async () => {
    const concert = await appController.createConcert(role, organizationId, {
      title: 'Summer Stage',
      venue: 'District Hall',
      startsAt: '2026-07-20T20:00',
      status: 'published',
    });

    const updatedConcert = await appController.updateConcert(role, organizationId, concert.id, {
      title: 'Summer Stage Updated',
    });

    const ticketType = await appController.createTicketType(role, organizationId, concert.id, {
      zoneCode: 'vip',
      price: 1200000,
      capacity: 80,
      saleStartsAt: '2026-06-20T09:00',
      saleEndsAt: '2026-07-20T18:00',
      perUserLimit: 2,
    });

    const updatedTicketType = await appController.updateTicketType(
      role,
      organizationId,
      ticketType.id,
      {
        capacity: 75,
        saleEndsAt: '2026-07-20T19:00',
      },
    );

    const publicConcert = await appController.getConcert(concert.id);

    expect(updatedConcert.title).toBe('Summer Stage Updated');
    expect(updatedTicketType.capacity).toBe(75);
    expect(ticketType.zoneCode).toBe('VIP');
    expect(publicConcert.ticketTypes).toHaveLength(1);
    expect(publicConcert.ticketTypes[0].capacity).toBe(75);
  });

  it('blocks organizers from updating concerts outside their organization', async () => {
    const concert = await appController.createConcert(role, organizationId, {
      title: 'Private Stage',
      venue: 'District Hall',
      startsAt: '2026-07-20T20:00',
      status: 'draft',
    });

    await expect(
      appController.updateConcert(role, 'org-other', concert.id, {
        title: 'Hijacked Stage',
      }),
    ).rejects.toThrow('Concert not found');
  });

  it('keeps ticket issuance successful when notification fails', async () => {
    const concert = await appController.createConcert(role, organizationId, {
      title: 'Notification Stage',
      venue: 'District Hall',
      startsAt: '2026-07-20T20:00',
      status: 'published',
    });

    const issuedTicket = appController.issueTicket({
      ticketId: 'ticket-1',
      orderId: 'order-1',
      concertId: concert.id,
      forceNotificationFailure: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    const notifications = await appController.listNotifications(role, organizationId);

    expect(issuedTicket.issued).toBe(true);
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'TicketIssued',
          status: 'failed',
        }),
      ]),
    );
  });
});
