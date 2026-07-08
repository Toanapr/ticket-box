import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { buildGuestRef } from './guest-list-ref.util';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

@Injectable()
export class GuestListEmailService {
  private readonly logger = new Logger(GuestListEmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendPublishedGuestInvitations(versionId: string): Promise<number> {
    const version = await this.prisma.guestListVersion.findUnique({
      where: { id: versionId },
      include: {
        concert: true,
        entries: {
          where: {
            email: {
              not: null,
            },
          },
          orderBy: {
            fullName: 'asc',
          },
        },
      },
    });

    if (!version || version.entries.length === 0) {
      return 0;
    }

    const config = this.readConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    let sentCount = 0;

    for (const entry of version.entries) {
      if (!entry.email) {
        continue;
      }

      const guestRef = buildGuestRef(entry.id);
      const qrCid = `guest-qr-${entry.id}`;
      const qrBuffer = await QRCode.toBuffer(guestRef, {
        margin: 1,
        width: 250,
        errorCorrectionLevel: 'M',
      });

      await transporter.sendMail({
        from: config.from,
        to: entry.email,
        subject: 'TicketBox guest invitation',
        text: this.buildTextBody({
          guestName: entry.fullName,
          concertTitle: version.concert.title,
          artistName: version.concert.artistName,
          venue: version.concert.venue,
          startAt: version.concert.startAt,
          guestRef,
        }),
        html: this.buildHtmlBody({
          guestName: entry.fullName,
          concertTitle: version.concert.title,
          artistName: version.concert.artistName,
          venue: version.concert.venue,
          startAt: version.concert.startAt,
          guestRef,
          qrCid,
        }),
        attachments: [
          {
            filename: `guest-qr-${entry.id}.png`,
            content: qrBuffer,
            cid: qrCid,
          },
        ],
      });

      sentCount += 1;
    }

    this.logger.log(
      `Sent ${sentCount} guest invitation email(s) for guest list version ${versionId}`,
    );

    return sentCount;
  }

  private buildTextBody(input: {
    guestName: string;
    concertTitle: string;
    artistName: string;
    venue: string;
    startAt: Date;
    guestRef: string;
  }): string {
    return [
      `Xin chao ${input.guestName},`,
      '',
      `Ban da duoc them vao guest list cua su kien "${input.concertTitle}".`,
      `Nghe si: ${input.artistName}`,
      `Dia diem: ${input.venue}`,
      `Thoi gian: ${this.formatDate(input.startAt)}`,
      '',
      'Day la ma QR thuc de check-in tai cong.',
      `Guest ref: ${input.guestRef}`,
      '',
      'Vui long mang email nay hoac ma QR dinh kem khi den su kien.',
    ].join('\n');
  }

  private buildHtmlBody(input: {
    guestName: string;
    concertTitle: string;
    artistName: string;
    venue: string;
    startAt: Date;
    guestRef: string;
    qrCid: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TicketBox guest invitation</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #0891b2 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 800;">TicketBox</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px;">Thu moi guest list</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="margin-top: 0; font-size: 16px; line-height: 1.6;">Xin chao <strong>${this.escapeHtml(input.guestName)}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.7; color: #475569;">
        Ban da duoc ban to chuc them vao guest list. Ma QR duoi day la ma thuc de check-in voi scanner tai cong.
      </p>

      <div style="background-color: #f8fafc; border-left: 4px solid #0891b2; border-radius: 10px; padding: 18px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #0f172a;">${this.escapeHtml(input.concertTitle)}</h3>
        <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Nghe si:</strong> ${this.escapeHtml(input.artistName)}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Dia diem:</strong> ${this.escapeHtml(input.venue)}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Thoi gian:</strong> ${this.escapeHtml(this.formatDate(input.startAt))}</p>
      </div>

      <div style="border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #0891b2; font-weight: 700;">Guest QR</p>
        <div style="display: inline-block; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
          <img src="cid:${this.escapeHtml(input.qrCid)}" alt="Guest QR Code" width="180" height="180" style="display: block;" />
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748b;">Guest ref: <span style="font-family: monospace; color: #0f172a;">${this.escapeHtml(input.guestRef)}</span></p>
      </div>

      <p style="font-size: 14px; line-height: 1.7; color: #475569; margin-bottom: 0;">
        Vui long dua email nay hoac ma QR cho nhan vien soat ve tai cong.
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0;">Email nay duoc gui tu dong tu he thong TicketBox.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private readConfig(): SmtpConfig {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService
      .get<string>('SMTP_PASS')
      ?.replaceAll(/\s/g, '');
    const from =
      this.configService.get<string>('SMTP_FROM')?.trim() ??
      (user ? `TicketBox <${user}>` : undefined);

    if (!host || !user || !pass || !from) {
      throw new Error(
        'SMTP email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.',
      );
    }

    return {
      host,
      user,
      pass,
      from,
      port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
      secure:
        this.configService.get<string>('SMTP_SECURE')?.toLowerCase() === 'true',
    };
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date(value));
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
