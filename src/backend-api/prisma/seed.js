const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');

const prisma = new PrismaClient();

const KEY_LENGTH = 64;

const organizationId = '11111111-1111-4111-8111-111111111111';
const organizerId = '22222222-2222-4222-8222-222222222222';
const audienceId = '33333333-3333-4333-8333-333333333333';

/**
 * Hash password theo đúng định dạng backend đang sử dụng:
 * scrypt:<salt>:<hash>
 */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');

  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');

  return `scrypt:${salt}:${hash}`;
}

const concerts = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    organizationId,
    title: 'TicketBox Summer Live',
    slug: 'ticketbox-summer-live',
    venue: 'Saigon Exhibition Hall',
    artistName: 'The Aurora Lights',
    description: 'A high-energy summer concert with five ticket zones.',
    startAt: new Date('2026-12-20T13:00:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/summer-live.svg',
    publishedArtistBio:
      'The Aurora Lights blend pop, electronic, and orchestral textures for arena-scale shows.',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    organizationId,
    title: 'TicketBox Winter Night',
    slug: 'ticketbox-winter-night',
    venue: 'Hanoi Indoor Arena',
    artistName: 'Luna River',
    description: 'A winter concert focused on ballads and acoustic sets.',
    startAt: new Date('2027-01-15T13:00:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/winter-night.svg',
    publishedArtistBio:
      'Luna River is known for intimate vocals, cinematic staging, and fan-led choruses.',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    organizationId,
    title: 'TicketBox Reservation Test',
    slug: 'ticketbox-reservation-test',
    venue: 'Local Docker Test Venue',
    artistName: 'TicketBox Test Artist',
    description:
      'A dedicated concert used for reservation, order, payment, and ticket testing.',
    startAt: new Date('2027-02-01T13:00:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/reservation-test.svg',
    publishedArtistBio:
      'Seed data used exclusively for local backend integration testing.',
  },
];

const ticketTypes = [
  {
    id: '66666666-6666-4666-8666-666666666661',
    concertId: concerts[0].id,
    zoneCode: 'SVIP',
    name: 'SVIP',
    price: '2500000.00',
    capacity: 100,
    perUserLimit: 2,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666662',
    concertId: concerts[0].id,
    zoneCode: 'VIP',
    name: 'VIP',
    price: '1800000.00',
    capacity: 250,
    perUserLimit: 4,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666663',
    concertId: concerts[0].id,
    zoneCode: 'CAT1',
    name: 'CAT 1',
    price: '1200000.00',
    capacity: 500,
    perUserLimit: 4,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666664',
    concertId: concerts[0].id,
    zoneCode: 'CAT2',
    name: 'CAT 2',
    price: '800000.00',
    capacity: 800,
    perUserLimit: 6,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
  },
  {
    id: '66666666-6666-4666-8666-666666666665',
    concertId: concerts[0].id,
    zoneCode: 'GA',
    name: 'General Admission',
    price: '500000.00',
    capacity: 1200,
    perUserLimit: 6,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
  },
  {
    id: '77777777-7777-4777-8777-777777777771',
    concertId: concerts[1].id,
    zoneCode: 'VIP',
    name: 'VIP',
    price: '1500000.00',
    capacity: 200,
    perUserLimit: 4,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2027-01-14T16:59:00.000Z'),
  },
  {
    id: '77777777-7777-4777-8777-777777777772',
    concertId: concerts[1].id,
    zoneCode: 'GA',
    name: 'General Admission',
    price: '450000.00',
    capacity: 1000,
    perUserLimit: 6,
    saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
    saleEndAt: new Date('2027-01-14T16:59:00.000Z'),
  },

  // Ticket type phục vụ test reservation, order, payment và ticket.
  {
    id: '11111111-1111-4111-8111-111111111111',
    concertId: concerts[2].id,
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
    concertId: concerts[2].id,
    zoneCode: 'CAT1',
    name: 'CAT1 Standard',
    price: '1800000.00',
    capacity: 1000,
    perUserLimit: 4,
    saleStartAt: new Date('2026-06-01T00:00:00.000Z'),
    saleEndAt: new Date('2026-12-31T23:59:59.000Z'),
  },
];

async function seedOrganization() {
  await prisma.organization.upsert({
    where: {
      id: organizationId,
    },
    create: {
      id: organizationId,
      name: 'TicketBox Demo Organizer',
    },
    update: {
      name: 'TicketBox Demo Organizer',
    },
  });
}

async function seedUsers() {
  const passwordHash = hashPassword('Password123!');

  await prisma.user.upsert({
    where: {
      id: organizerId,
    },
    create: {
      id: organizerId,
      organizationId,
      email: 'organizer@ticketbox.local',
      role: 'organizer',
      status: 'active',
      passwordHash,
    },
    update: {
      organizationId,
      email: 'organizer@ticketbox.local',
      role: 'organizer',
      status: 'active',
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: {
      id: audienceId,
    },
    create: {
      id: audienceId,
      organizationId: null,
      email: 'audience@ticketbox.local',
      role: 'audience',
      status: 'active',
      passwordHash,
    },
    update: {
      organizationId: null,
      email: 'audience@ticketbox.local',
      role: 'audience',
      status: 'active',
      passwordHash,
    },
  });
}

async function seedConcerts() {
  for (const concert of concerts) {
    await prisma.concert.upsert({
      where: {
        id: concert.id,
      },
      create: concert,
      update: {
        organizationId: concert.organizationId,
        title: concert.title,
        slug: concert.slug,
        venue: concert.venue,
        artistName: concert.artistName,
        description: concert.description,
        startAt: concert.startAt,
        status: concert.status,
        seatingMapObjectKey: concert.seatingMapObjectKey,
        publishedArtistBio: concert.publishedArtistBio,
      },
    });
  }
}

async function seedTicketTypesAndInventory() {
  for (const ticketType of ticketTypes) {
    await prisma.$transaction(async (tx) => {
      await tx.ticketType.upsert({
        where: {
          id: ticketType.id,
        },
        create: ticketType,
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
      });

      await tx.inventoryCounter.upsert({
        where: {
          ticketTypeId: ticketType.id,
        },
        create: {
          ticketTypeId: ticketType.id,
          totalCapacity: ticketType.capacity,
          reservedCount: 0,
          soldCount: 0,
          version: 0,
        },
        update: {
          totalCapacity: ticketType.capacity,
        },
      });
    });
  }
}

async function main() {
  await seedOrganization();
  await seedUsers();
  await seedConcerts();
  await seedTicketTypesAndInventory();

  console.log('Seed complete.');
  console.log('Organizations: 1');
  console.log('Users: 2');
  console.log(`Concerts: ${concerts.length}`);
  console.log(`Ticket types: ${ticketTypes.length}`);

  console.log('');
  console.log('Demo accounts:');
  console.log('Organizer: organizer@ticketbox.local / Password123!');
  console.log('Audience: audience@ticketbox.local / Password123!');

  console.log('');
  console.log('Reservation test ticket types:');

  for (const ticketType of ticketTypes.slice(-2)) {
    console.log(`- ${ticketType.name}: ${ticketType.id}`);
  }
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
