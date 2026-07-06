import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import nodemailer from 'nodemailer';
import { PrismaService } from '../../../prisma/prisma.service';
import { SmtpEmailChannelAdapter } from './smtp-email-channel.adapter';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

const task = {
  id: 'notification-id',
  organizationId: 'organization-id',
  eventType: 'TicketIssued',
  notificationType: 'TicketIssued',
  concertId: 'concert-id',
  orderId: 'order-id',
  ownerUserId: 'user-id',
  ticketCount: 1,
  channel: NotificationChannel.email,
  status: NotificationStatus.pending,
  idempotencyKey: 'ticket-issued:order-id:email',
  message: 'Your e-ticket is ready.',
  error: null,
  scheduledFor: new Date('2026-07-06T00:00:00.000Z'),
  processedAt: null,
  createdAt: new Date('2026-07-06T00:00:00.000Z'),
};

function createAdapter(overrides: Record<string, string | undefined> = {}) {
  const config = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'huynhthaitoan111@gmail.com',
    SMTP_PASS: 'app password',
    SMTP_FROM: 'TicketBox <huynhthaitoan111@gmail.com>',
    ...overrides,
  };

  return new SmtpEmailChannelAdapter(
    {
      get: (key: string) => config[key],
    } as ConfigService,
    {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'order-id',
          buyerFullName: 'John Doe',
          buyerEmail: 'ticket-recipient@example.com',
          totalAmount: 100000,
          tickets: [
            {
              id: 'ticket-1',
              qrToken: 'test-qr-token',
              qrTokenHash: 'test-qr-token-hash',
              sequenceNo: 1,
              ticketType: {
                name: 'VIP Zone',
                concert: {
                  id: 'concert-id',
                  title: 'Mock Concert',
                  venue: 'Mock Venue',
                  artistName: 'Mock Artist',
                  startAt: new Date('2026-07-06T18:00:00.000Z'),
                },
              },
            },
          ],
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'audience@example.com',
        }),
      },
      concert: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'concert-id',
          title: 'Mock Concert',
          venue: 'Mock Venue',
          artistName: 'Mock Artist',
          startAt: new Date('2026-07-06T18:00:00.000Z'),
        }),
      },
    } as unknown as PrismaService,
  );
}

describe('SmtpEmailChannelAdapter', () => {
  const sendMail = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);
  });

  it('sends email through configured Gmail SMTP', async () => {
    const adapter = createAdapter();

    await adapter.send(task);

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'huynhthaitoan111@gmail.com',
        pass: 'apppassword',
      },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'TicketBox <huynhthaitoan111@gmail.com>',
        to: 'ticket-recipient@example.com',
        subject: 'TicketBox e-ticket confirmation',
        text: 'Your e-ticket is ready.',
      }),
    );
  });

  it('fails clearly when SMTP password is missing', async () => {
    const adapter = createAdapter({ SMTP_PASS: '' });

    await expect(adapter.send(task)).rejects.toThrow(
      'SMTP email is not configured',
    );
  });
});
