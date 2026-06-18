import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AppService, ConcertStatus, DEFAULT_ORGANIZATION_ID } from './app.service';
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

type AdminContext = {
  organizationId: string;
};

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly notificationService: NotificationService,
  ) {}

  @Get('admin/concerts')
  listAdminConcerts(
    @Headers('x-user-role') role?: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    return this.appService.listAdminConcerts(admin.organizationId);
  }

  @Post('admin/concerts')
  createConcert(
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Body() body: ConcertBody,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    const payload = this.assertConcertBody(body);

    return this.appService.createConcert({
      organizationId: admin.organizationId,
      title: payload.title,
      venue: payload.venue,
      startsAt: payload.startsAt,
      status: payload.status,
    });
  }

  @Patch('admin/concerts/:id')
  updateConcert(
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() body: ConcertBody,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    const payload = this.assertOptionalConcertBody(body);

    return this.appService.updateConcert(id, admin.organizationId, payload);
  }

  @Get('concerts')
  listPublicConcerts() {
    return this.appService.listPublicConcerts();
  }

  @Get('concerts/:id')
  getConcert(@Param('id') id: string) {
    return this.appService.getConcert(id);
  }

  @Get('admin/concerts/:id')
  getAdminConcert(
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    return this.appService.getConcert(id, admin.organizationId);
  }

  @Post('admin/concerts/:id/ticket-types')
  createTicketType(
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') concertId: string,
    @Body() body: TicketTypeBody,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    const payload = this.assertTicketTypeBody(body);

    return this.appService.createTicketType(concertId, admin.organizationId, payload);
  }

  @Patch('admin/ticket-types/:id')
  updateTicketType(
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('id') id: string,
    @Body() body: TicketTypeBody,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    const payload = this.assertOptionalTicketTypeBody(body);

    return this.appService.updateTicketType(id, admin.organizationId, payload);
  }

  @Post('tickets/issue')
  issueTicket(@Body() body: Partial<TicketIssuedEvent>) {
    if (!body.concertId) {
      throw new BadRequestException('concertId is required');
    }

    const ticket = {
      ticketId: body.ticketId ?? `ticket-${Date.now()}`,
      orderId: body.orderId ?? `order-${Date.now()}`,
      concertId: body.concertId,
      recipientEmail: body.recipientEmail,
    };

    this.notificationService.dispatchTicketIssued({
      ...ticket,
      forceNotificationFailure: body.forceNotificationFailure,
    });

    return {
      ...ticket,
      issued: true,
    };
  }

  @Get('admin/notifications')
  listNotifications(
    @Headers('x-user-role') role?: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const admin = this.assertAdmin(role, organizationId);
    return this.notificationService.listRecords(admin.organizationId);
  }

  private assertAdmin(role: string | undefined, organizationId: string | undefined): AdminContext {
    if (role !== 'organizer' && role !== 'system_admin') {
      throw new ForbiddenException('organizer or system_admin role is required');
    }

    const scopedOrganizationId = organizationId?.trim() || DEFAULT_ORGANIZATION_ID;

    return {
      organizationId: scopedOrganizationId,
    };
  }

  private assertConcertBody(body: ConcertBody) {
    const title = this.assertRequiredText(body.title, 'title');
    const venue = this.assertRequiredText(body.venue, 'venue');
    const startsAt = this.assertRequiredDate(body.startsAt, 'startsAt');
    this.assertStatus(body.status);

    return {
      title,
      venue,
      startsAt,
      status: body.status,
    };
  }

  private assertOptionalConcertBody(body: ConcertBody) {
    this.assertStatus(body.status);

    return {
      ...(body.title !== undefined ? { title: this.assertRequiredText(body.title, 'title') } : {}),
      ...(body.venue !== undefined ? { venue: this.assertRequiredText(body.venue, 'venue') } : {}),
      ...(body.startsAt !== undefined
        ? { startsAt: this.assertRequiredDate(body.startsAt, 'startsAt') }
        : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    };
  }

  private assertTicketTypeBody(body: TicketTypeBody) {
    const zoneCode = this.assertRequiredText(body.zoneCode, 'zoneCode');
    const price = this.assertPositiveNumber(body.price, 'price');
    const capacity = this.assertPositiveNumber(body.capacity, 'capacity');
    const saleStartsAt = this.assertRequiredDate(body.saleStartsAt, 'saleStartsAt');
    const saleEndsAt = this.assertRequiredDate(body.saleEndsAt, 'saleEndsAt');
    const perUserLimit = this.assertPositiveNumber(body.perUserLimit, 'perUserLimit');

    if (saleEndsAt <= saleStartsAt) {
      throw new BadRequestException('saleEndsAt must be after saleStartsAt');
    }

    return {
      zoneCode,
      price,
      capacity,
      saleStartsAt,
      saleEndsAt,
      perUserLimit,
    };
  }

  private assertOptionalTicketTypeBody(body: TicketTypeBody) {
    const payload = {
      ...(body.zoneCode !== undefined
        ? { zoneCode: this.assertRequiredText(body.zoneCode, 'zoneCode') }
        : {}),
      ...(body.price !== undefined ? { price: this.assertPositiveNumber(body.price, 'price') } : {}),
      ...(body.capacity !== undefined
        ? { capacity: this.assertPositiveNumber(body.capacity, 'capacity') }
        : {}),
      ...(body.saleStartsAt !== undefined
        ? { saleStartsAt: this.assertRequiredDate(body.saleStartsAt, 'saleStartsAt') }
        : {}),
      ...(body.saleEndsAt !== undefined
        ? { saleEndsAt: this.assertRequiredDate(body.saleEndsAt, 'saleEndsAt') }
        : {}),
      ...(body.perUserLimit !== undefined
        ? { perUserLimit: this.assertPositiveNumber(body.perUserLimit, 'perUserLimit') }
        : {}),
    };

    if (payload.saleStartsAt && payload.saleEndsAt && payload.saleEndsAt <= payload.saleStartsAt) {
      throw new BadRequestException('saleEndsAt must be after saleStartsAt');
    }

    return payload;
  }

  private assertRequiredText(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private assertRequiredDate(value: unknown, field: string): Date {
    const text = this.assertRequiredText(value, field);
    const date = new Date(text);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    return date;
  }

  private assertPositiveNumber(value: unknown, field: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      throw new BadRequestException(`${field} must be a positive number`);
    }

    return value;
  }

  private assertStatus(value: unknown) {
    if (value !== undefined && value !== 'draft' && value !== 'published') {
      throw new BadRequestException('status must be draft or published');
    }
  }
}
