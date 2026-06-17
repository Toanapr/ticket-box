import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationService } from './notification.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, NotificationService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('creates a concert and ticket type for audience listing', () => {
    const concert = appController.createConcert({
      title: 'Summer Stage',
      venue: 'District Hall',
      startsAt: '2026-07-20T20:00',
      status: 'published',
    });

    const ticketType = appController.createTicketType(concert.id, {
      zoneCode: 'vip',
      price: 1200000,
      capacity: 80,
      saleStartsAt: '2026-06-20T09:00',
      saleEndsAt: '2026-07-20T18:00',
      perUserLimit: 2,
    });

    const publicConcert = appController.getConcert(concert.id);

    expect(ticketType.zoneCode).toBe('VIP');
    expect(publicConcert.ticketTypes).toHaveLength(1);
    expect(publicConcert.ticketTypes[0].capacity).toBe(80);
  });

  it('keeps ticket issuance successful when notification fails', async () => {
    const issuedTicket = await appController.issueTicket({
      ticketId: 'ticket-1',
      orderId: 'order-1',
      concertId: 'concert-1',
      forceNotificationFailure: true,
    });

    const notifications = appController.listNotifications();

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
