import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Scanner Data...');

  // 1. Tạo device
  const deviceId = randomUUID();
  const deviceCode = 'DEV-DEMO-001';
  const scannerUserId = 'scanner-user-demo-1';
  
  await prisma.scannerDevice.upsert({
    where: { deviceCode },
    update: { scannerUserId, status: 'active' },
    create: {
      id: deviceId,
      deviceCode,
      scannerUserId,
      status: 'active',
    },
  });

  // 2. Lấy concert đầu tiên từ DB (tạo bởi seed.js)
  const concert = await prisma.concert.findFirst();
  if (!concert) {
    console.error('Không tìm thấy Concert! Hãy chạy "npm run db:seed" trước.');
    return;
  }

  // 3. Tạo Assignment cho concert này
  const assignmentId = randomUUID();
  await prisma.scannerAssignment.create({
    data: {
      id: assignmentId,
      deviceId,
      scannerUserId,
      eventId: concert.id, // dùng concert.id làm eventId
      concertId: concert.id,
      gateCode: 'GATE_MAIN',
      zoneCode: 'VIP',
      status: 'active',
      manifestVersion: 1,
      manifestIssuedAt: new Date(),
      manifestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // hết hạn sau 1 ngày
    },
  });

  // 4. Tạo một vài vé vào Manifest để có mã QR test
  const ticket1 = 'TICKET-VIP-001';
  const ticket2 = 'TICKET-VIP-002';
  
  await prisma.scannerManifestTicket.createMany({
    data: [
      {
        id: randomUUID(),
        assignmentId,
        ticketId: randomUUID(),
        ticketRef: ticket1,
        rawToken: ticket1,
        ticketTypeId: 'vip-ticket-type',
        status: 'issued',
        eventId: concert.id,
        concertId: concert.id,
        gateCode: 'GATE_MAIN',
        zoneCode: 'VIP',
      },
      {
        id: randomUUID(),
        assignmentId,
        ticketId: randomUUID(),
        ticketRef: ticket2,
        rawToken: ticket2,
        ticketTypeId: 'vip-ticket-type',
        status: 'issued',
        eventId: concert.id,
        concertId: concert.id,
        gateCode: 'GATE_MAIN',
        zoneCode: 'VIP',
      }
    ]
  });

  console.log('----- THÔNG TIN CẤU HÌNH SCANNER APP -----');
  console.log('Device ID:', deviceCode);
  console.log('Access Token (API Key): scanner:' + scannerUserId);
  console.log('------------------------------------------');
  console.log('Danh sách mã vé (dùng công cụ tạo mã QR text này để quét thử):');
  console.log('Vé 1:', ticket1);
  console.log('Vé 2:', ticket2);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
