const { PrismaClient, ReservationStatus, OrderStatus, PaymentStatus, TicketStatus } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleTicketTypes = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    concertId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    zoneCode: 'SVIP',
    name: 'SVIP Early Access',
    price: '3500000.00',
    capacity: 200,
    perUserLimit: 2,
    saleStartAt: new Date('2026-06-01T00:00:00.000Z'),
    saleEndAt: new Date('2026-12-31T23:59:59.000Z'),
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    concertId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    zoneCode: 'CAT1',
    name: 'CAT1 Standard',
    price: '1800000.00',
    capacity: 1000,
    perUserLimit: 4,
    saleStartAt: new Date('2026-06-01T00:00:00.000Z'),
    saleEndAt: new Date('2026-12-31T23:59:59.000Z'),
  },
];

async function main() {
  await ensureEnumsReachClient();

  for (const ticketType of sampleTicketTypes) {
    await prisma.ticketType.upsert({
      where: { id: ticketType.id },
      update: {
        concertId: ticketType.concertId,
        zoneCode: ticketType.zoneCode,
        name: ticketType.name,
        price: ticketType.price,
        capacity: ticketType.capacity,
        perUserLimit: ticketType.perUserLimit,
        saleStartAt: ticketType.saleStartAt,
        saleEndAt: ticketType.saleEndAt,
      },
      create: ticketType,
    });

    await prisma.inventoryCounter.upsert({
      where: { ticketTypeId: ticketType.id },
      update: {
        totalCapacity: ticketType.capacity,
      },
      create: {
        ticketTypeId: ticketType.id,
        totalCapacity: ticketType.capacity,
        reservedCount: 0,
        soldCount: 0,
        version: 0,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Sample ticket types ready for reservation testing:');
  for (const ticketType of sampleTicketTypes) {
    console.log(`- ${ticketType.name}: ${ticketType.id}`);
  }
  console.log('Use any UUID v4 value as x-user-id header for auth mock.');
}

async function ensureEnumsReachClient() {
  void ReservationStatus;
  void OrderStatus;
  void PaymentStatus;
  void TicketStatus;
}

main()
  .catch((error) => {
    console.error('Seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
