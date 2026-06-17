import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AppService, ConcertStatus } from './app.service';
import { NotificationService, TicketIssuedEvent } from './notification.service';

type ConcertBody = {
  title?: string;
  venue?: string;
  startsAt?: string;
  status?: ConcertStatus;
};

type TicketTypeBody = {
  zoneCode?: string;
  price?: number;
  capacity?: number;
  saleStartsAt?: string;
  saleEndsAt?: string;
  perUserLimit?: number;
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('admin/concerts')
  listAdminConcerts() {
    return this.appService.listAdminConcerts();
  }

  @Post('admin/concerts')
  createConcert(@Body() body: ConcertBody) {
    this.assertConcertBody(body);

    return this.appService.createConcert({
      title: body.title,
      venue: body.venue,
      startsAt: body.startsAt,
      status: body.status,
    });
  }

  @Patch('admin/concerts/:id')
  updateConcert(@Param('id') id: string, @Body() body: ConcertBody) {
    this.assertOptionalConcertBody(body);

    return this.appService.updateConcert(id, body);
  }

  @Get('concerts')
  listPublicConcerts() {
    return this.appService.listPublicConcerts();
  }

  @Get('concerts/:id')
  getConcert(@Param('id') id: string) {
    return this.appService.getConcert(id);
  }

  @Post('admin/concerts/:id/ticket-types')
  createTicketType(@Param('id') concertId: string, @Body() body: TicketTypeBody) {
    this.assertTicketTypeBody(body);

    return this.appService.createTicketType(concertId, {
      zoneCode: body.zoneCode,
      price: body.price,
      capacity: body.capacity,
      saleStartsAt: body.saleStartsAt,
      saleEndsAt: body.saleEndsAt,
      perUserLimit: body.perUserLimit,
    });
  }

  @Patch('admin/ticket-types/:id')
  updateTicketType(@Param('id') id: string, @Body() body: TicketTypeBody) {
    this.assertOptionalTicketTypeBody(body);

    return this.appService.updateTicketType(id, body);
  }

  @Post('tickets/issue')
  async issueTicket(@Body() body: Partial<TicketIssuedEvent>) {
    if (!body.concertId) {
      throw new BadRequestException('concertId is required');
    }

    const ticket = {
      ticketId: body.ticketId ?? `ticket-${Date.now()}`,
      orderId: body.orderId ?? `order-${Date.now()}`,
      concertId: body.concertId,
      recipientEmail: body.recipientEmail,
    };

    await this.notificationService.handleTicketIssued({
      ...ticket,
      forceNotificationFailure: body.forceNotificationFailure,
    });

    return {
      ...ticket,
      issued: true,
    };
  }

  @Get('admin/notifications')
  listNotifications() {
    return this.notificationService.listRecords();
  }

  private assertConcertBody(body: ConcertBody): asserts body is Required<ConcertBody> {
    this.assertRequiredText(body.title, 'title');
    this.assertRequiredText(body.venue, 'venue');
    this.assertRequiredText(body.startsAt, 'startsAt');
    this.assertStatus(body.status);
  }

  private assertOptionalConcertBody(body: ConcertBody) {
    this.assertOptionalText(body.title, 'title');
    this.assertOptionalText(body.venue, 'venue');
    this.assertOptionalText(body.startsAt, 'startsAt');
    this.assertStatus(body.status);
  }

  private assertTicketTypeBody(body: TicketTypeBody): asserts body is Required<TicketTypeBody> {
    this.assertRequiredText(body.zoneCode, 'zoneCode');
    this.assertPositiveNumber(body.price, 'price');
    this.assertPositiveNumber(body.capacity, 'capacity');
    this.assertRequiredText(body.saleStartsAt, 'saleStartsAt');
    this.assertRequiredText(body.saleEndsAt, 'saleEndsAt');
    this.assertPositiveNumber(body.perUserLimit, 'perUserLimit');

    if (String(body.saleEndsAt) <= String(body.saleStartsAt)) {
      throw new BadRequestException('saleEndsAt must be after saleStartsAt');
    }
  }

  private assertOptionalTicketTypeBody(body: TicketTypeBody) {
    this.assertOptionalText(body.zoneCode, 'zoneCode');
    this.assertOptionalText(body.saleStartsAt, 'saleStartsAt');
    this.assertOptionalText(body.saleEndsAt, 'saleEndsAt');

    if (body.price !== undefined) {
      this.assertPositiveNumber(body.price, 'price');
    }

    if (body.capacity !== undefined) {
      this.assertPositiveNumber(body.capacity, 'capacity');
    }

    if (body.perUserLimit !== undefined) {
      this.assertPositiveNumber(body.perUserLimit, 'perUserLimit');
    }
  }

  private assertRequiredText(value: unknown, field: string): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
  }

  private assertOptionalText(value: unknown, field: string) {
    if (value !== undefined) {
      this.assertRequiredText(value, field);
    }
  }

  private assertPositiveNumber(value: unknown, field: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive number`);
    }
  }

  private assertStatus(value: unknown) {
    if (value !== undefined && value !== 'draft' && value !== 'published') {
      throw new BadRequestException('status must be draft or published');
    }
  }
}
