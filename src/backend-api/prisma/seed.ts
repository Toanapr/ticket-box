import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();

const organizationId = '11111111-1111-4111-8111-111111111111';
const organizerId = '22222222-2222-4222-8222-222222222222';
const audienceId = '33333333-3333-4333-8333-333333333333';

const concerts = [
  {
    id: '44444444-4444-4444-8444-444444444444',
    title: 'TicketBox Summer Live',
    venue: 'Saigon Exhibition Hall',
    artistName: 'The Aurora Lights',
    description: 'A high-energy summer concert with five ticket zones.',
    startAt: new Date('2026-12-20T13:00:00.000Z'),
    status: 'published' as const,
    seatingMapObjectKey: 'seating-maps/summer-live.svg',
    publishedArtistBio:
      'The Aurora Lights blend pop, electronic, and orchestral textures for arena-scale shows.',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    title: 'TicketBox Winter Night',
    venue: 'Hanoi Indoor Arena',
    artistName: 'Luna River',
    description: 'A winter concert focused on ballads and acoustic sets.',
    startAt: new Date('2027-01-15T13:00:00.000Z'),
    status: 'published' as const,
    seatingMapObjectKey: 'seating-maps/winter-night.svg',
    publishedArtistBio:
      'Luna River is known for intimate vocals, cinematic staging, and fan-led choruses.',
  },
];

const ticketTypes = [
  [
    '66666666-6666-4666-8666-666666666661',
    concerts[0].id,
    'SVIP',
    'SVIP',
    '2500000.00',
    100,
    2,
  ],
  [
    '66666666-6666-4666-8666-666666666662',
    concerts[0].id,
    'VIP',
    'VIP',
    '1800000.00',
    250,
    4,
  ],
  [
    '66666666-6666-4666-8666-666666666663',
    concerts[0].id,
    'CAT1',
    'CAT 1',
    '1200000.00',
    500,
    4,
  ],
  [
    '66666666-6666-4666-8666-666666666664',
    concerts[0].id,
    'CAT2',
    'CAT 2',
    '800000.00',
    800,
    6,
  ],
  [
    '66666666-6666-4666-8666-666666666665',
    concerts[0].id,
    'GA',
    'General Admission',
    '500000.00',
    1200,
    6,
  ],
  [
    '77777777-7777-4777-8777-777777777771',
    concerts[1].id,
    'VIP',
    'VIP',
    '1500000.00',
    200,
    4,
  ],
  [
    '77777777-7777-4777-8777-777777777772',
    concerts[1].id,
    'GA',
    'General Admission',
    '450000.00',
    1000,
    6,
  ],
] as const;

async function main() {
  const passwordHash = hashPassword('Password123!');

  await prisma.organization.upsert({
    where: { id: organizationId },
    create: {
      id: organizationId,
      name: 'TicketBox Demo Organizer',
    },
    update: {
      name: 'TicketBox Demo Organizer',
    },
  });

  await prisma.user.upsert({
    where: { id: organizerId },
    create: {
      id: organizerId,
      organizationId,
      email: 'organizer@ticketbox.local',
      role: 'organizer',
      passwordHash,
    },
    update: {
      organizationId,
      role: 'organizer',
      status: 'active',
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { id: audienceId },
    create: {
      id: audienceId,
      email: 'audience@ticketbox.local',
      role: 'audience',
      passwordHash,
    },
    update: {
      role: 'audience',
      status: 'active',
      passwordHash,
    },
  });

  for (const concert of concerts) {
    await prisma.concert.upsert({
      where: { id: concert.id },
      create: {
        ...concert,
        organizationId,
      },
      update: {
        ...concert,
        organizationId,
      },
    });
  }

  for (const [
    id,
    concertId,
    zoneCode,
    name,
    price,
    capacity,
    perUserLimit,
  ] of ticketTypes) {
    await prisma.$transaction(async (tx) => {
      await tx.ticketType.upsert({
        where: { id },
        create: {
          id,
          concertId,
          zoneCode,
          name,
          price,
          capacity,
          perUserLimit,
          saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
          saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
        },
        update: {
          zoneCode,
          name,
          price,
          capacity,
          perUserLimit,
          saleStartAt: new Date('2026-07-01T03:00:00.000Z'),
          saleEndAt: new Date('2026-12-19T16:59:00.000Z'),
        },
      });

      await tx.inventoryCounter.upsert({
        where: { ticketTypeId: id },
        create: {
          ticketTypeId: id,
          totalCapacity: capacity,
        },
        update: {
          totalCapacity: capacity,
        },
      });
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
