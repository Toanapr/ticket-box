import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationRecord } from '@prisma/client';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { formatStructuredLog } from '../../../common/logging/structured-log.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationChannelAdapter } from './notification-channel.adapter';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

@Injectable()
export class SmtpEmailChannelAdapter implements NotificationChannelAdapter {
  readonly channel = NotificationChannel.email;
  private readonly logger = new Logger(SmtpEmailChannelAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async send(task: NotificationRecord): Promise<void> {
    const config = this.readConfig();
    const recipient = await this.findRecipientEmail(task);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    let htmlContent = '';
    const attachments: any[] = [];

    const formatVND = (amount: number | string | any) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(Number(amount));
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(new Date(date));
    };

    if (task.notificationType === 'TicketIssued' && task.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: task.orderId },
        include: {
          tickets: {
            include: {
              ticketType: {
                include: {
                  concert: true,
                },
              },
            },
            orderBy: {
              sequenceNo: 'asc',
            },
          },
        },
      });

      if (order && order.tickets.length > 0) {
        const concert = order.tickets[0].ticketType.concert;
        const buyerName = order.buyerFullName || 'Khách hàng';
        const ticketCount = order.tickets.length;

        // Generate QR code images as attachments
        for (const ticket of order.tickets) {
          const qrVal = ticket.qrToken || ticket.qrTokenHash;
          const qrBuffer = await QRCode.toBuffer(qrVal, {
            margin: 1,
            width: 250,
            errorCorrectionLevel: 'M',
          });
          attachments.push({
            filename: `qr-${ticket.id}.png`,
            content: qrBuffer,
            cid: `qr-${ticket.id}`,
          });
        }

        // Render HTML for TicketIssued
        htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Xác nhận đặt vé TicketBox</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">TicketBox</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Xác nhận đặt vé thành công</p>
    </div>
    
    <!-- Content Body -->
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0;">Xin chào <strong>${this.escapeHtml(buyerName)}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Đơn hàng của bạn đã được thanh toán thành công và vé điện tử đã sẵn sàng. Dưới đây là thông tin chi tiết về vé của bạn:</p>
      
      <!-- Concert Card -->
      <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #1e293b; font-weight: 700;">${this.escapeHtml(concert.title)}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 100px; vertical-align: top;">Thời gian:</td>
            <td style="padding: 4px 0; color: #334155; font-weight: 600;">${formatDate(concert.startAt)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; vertical-align: top;">Địa điểm:</td>
            <td style="padding: 4px 0; color: #334155; font-weight: 500;">${this.escapeHtml(concert.venue)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; vertical-align: top;">Nghệ sĩ:</td>
            <td style="padding: 4px 0; color: #334155;">${this.escapeHtml(concert.artistName)}</td>
          </tr>
        </table>
      </div>

      <!-- Order Info -->
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Thông tin đơn hàng</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Mã đơn hàng:</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: bold; color: #111827;">${order.id}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Số lượng:</td>
            <td style="padding: 4px 0; text-align: right; color: #111827; font-weight: 600;">${ticketCount} vé</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Tổng thanh toán:</td>
            <td style="padding: 4px 0; text-align: right; color: #10b981; font-weight: bold; font-size: 16px;">${formatVND(order.totalAmount)}</td>
          </tr>
        </table>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin: 32px 0;"></div>

      <!-- Tickets Grid -->
      <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 16px 0; text-align: center;">VÉ ĐIỆN TỬ (E-TICKET)</h3>
      <p style="font-size: 13px; color: #6b7280; text-align: center; margin-bottom: 24px; line-height: 1.4;">
        Vui lòng bảo mật thông tin mã QR này. Mỗi mã QR chỉ có giá trị check-in một lần duy nhất tại sự kiện.
      </p>

      ${order.tickets.map((ticket, index) => `
        <div style="border: 2px dashed #cbd5e1; border-radius: 12px; background-color: #ffffff; padding: 24px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 12px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px;">VÉ ${index + 1} / ${ticketCount}</div>
          <div style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 8px 0;">${this.escapeHtml(ticket.ticketType.name)}</div>
          <div style="font-size: 13px; color: #64748b; margin-bottom: 16px;">Mã vé: <span style="font-family: monospace; font-weight: bold; color: #334155;">${ticket.id}</span></div>
          
          <!-- QR Code Embed -->
          <div style="background-color: #ffffff; padding: 12px; display: inline-block; border-radius: 8px; border: 1px solid #e2e8f0; margin: 8px 0;">
            <img src="cid:qr-${ticket.id}" alt="Ticket QR Code" width="160" height="160" style="display: block;" />
          </div>
          
          <div style="font-size: 12px; color: #94a3b8; margin-top: 12px;">Đưa mã này cho nhân viên soát vé tại cửa ra vào</div>
        </div>
      `).join('')}

      <div style="text-align: center; margin-top: 32px;">
        <p style="font-size: 14px; color: #4b5563;">Hẹn gặp lại bạn tại sự kiện!</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.5;">
      <p style="margin: 0 0 8px 0;">Email này được gửi tự động từ hệ thống TicketBox.</p>
      <p style="margin: 0;">Nếu cần hỗ trợ, vui lòng liên hệ qua hotline hoặc phản hồi email này.</p>
      <p style="margin: 8px 0 0 0;">&copy; ${new Date().getFullYear()} TicketBox. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;
      } else {
        htmlContent = `<p>${this.escapeHtml(task.message)}</p>`;
      }
    } else if (task.notificationType === 'ConcertReminder24h') {
      let concertInfoHtml = '';
      if (task.concertId) {
        const concert = await this.prisma.concert.findUnique({
          where: { id: task.concertId },
        });
        if (concert) {
          concertInfoHtml = `
            <div style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #92400e; font-weight: 700;">${this.escapeHtml(concert.title)}</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 4px 0; color: #b45309; width: 100px; vertical-align: top;">Bắt đầu lúc:</td>
                  <td style="padding: 4px 0; color: #78350f; font-weight: 600;">${formatDate(concert.startAt)}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #b45309; vertical-align: top;">Địa điểm:</td>
                  <td style="padding: 4px 0; color: #78350f; font-weight: 500;">${this.escapeHtml(concert.venue)}</td>
                </tr>
              </table>
            </div>
          `;
        }
      }

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nhắc nhở sự kiện TicketBox</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.5px;">TicketBox</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Nhắc nhở sự kiện sắp diễn ra</p>
    </div>
    
    <!-- Content Body -->
    <div style="padding: 32px 24px;">
      <p style="font-size: 16px; line-height: 1.5; margin-top: 0; font-weight: 600; color: #b45309;">Sự kiện của bạn sẽ bắt đầu trong vòng 24 giờ tới!</p>
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">Đừng quên thời gian tham gia sự kiện và mang theo vé điện tử của bạn để check-in tại cổng nhé.</p>
      
      ${concertInfoHtml}

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #475569;">
          Vé điện tử (E-ticket) và mã QR Code của bạn có thể được truy cập trực tiếp trong mục <strong>Vé của tôi</strong> trên ứng dụng TicketBox.
        </p>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <p style="font-size: 14px; color: #4b5563;">Chúc bạn có một trải nghiệm thật tuyệt vời tại sự kiện!</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.5;">
      <p style="margin: 0 0 8px 0;">Email này được gửi tự động từ hệ thống TicketBox.</p>
      <p style="margin: 0;">Nếu cần hỗ trợ, vui lòng liên hệ qua hotline hoặc phản hồi email này.</p>
      <p style="margin: 8px 0 0 0;">&copy; ${new Date().getFullYear()} TicketBox. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      htmlContent = `<p>${this.escapeHtml(task.message)}</p>`;
    }

    await transporter.sendMail({
      from: config.from,
      to: recipient,
      subject: this.subjectFor(task),
      text: task.message,
      html: htmlContent,
      attachments,
    });

    this.logger.log(
      formatStructuredLog('smtp_email_notification_sent', {
        notificationId: task.id,
        notificationType: task.notificationType,
        ownerUserId: task.ownerUserId,
      }),
    );
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

  private async findRecipientEmail(task: NotificationRecord): Promise<string> {
    if (task.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: task.orderId },
        select: { buyerEmail: true },
      });

      if (order?.buyerEmail) {
        return order.buyerEmail;
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: task.ownerUserId },
      select: { email: true },
    });

    if (!user?.email) {
      throw new Error(`recipient email not found for user ${task.ownerUserId}`);
    }

    return user.email;
  }

  private subjectFor(task: NotificationRecord): string {
    if (task.notificationType === 'ConcertReminder24h') {
      return 'TicketBox concert reminder';
    }

    if (task.notificationType === 'ConcertCanceledRefundRequired') {
      return 'TicketBox concert cancellation and refund update';
    }

    return 'TicketBox e-ticket confirmation';
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
