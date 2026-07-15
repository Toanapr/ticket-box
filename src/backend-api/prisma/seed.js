const { PrismaClient } = require('@prisma/client');
const { createHash, randomBytes, scryptSync } = require('node:crypto');
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} = require('node:fs');
const { join, resolve } = require('node:path');

const prisma = new PrismaClient();

const KEY_LENGTH = 64;

const ids = {
  organization: '11111111-1111-4111-8111-111111111111',
  organizer: '22222222-2222-4222-8222-222222222222',
  audienceA: '33333333-3333-4333-8333-333333333333',
  audienceB: '88888888-8888-4888-8888-888888888888',
  audienceC: '99999999-9999-4999-8999-999999999999',
  scannerVip: '12121212-1212-4212-8212-121212121212',
  scannerGuest: '13131313-1313-4313-8313-131313131313',
  concertSayHi: '44444444-4444-4444-8444-444444444444',
  concertChiDep: '55555555-5555-4555-8555-555555555555',
  concertChongGai: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  concertEmXinh: '77777777-7777-4777-8777-777777777777',
  concertCancelDemo: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
};

const demoUsers = [
  {
    id: ids.organizer,
    email: 'organizer@ticketbox.local',
    fullName: 'TicketBox Demo Organizer',
    role: 'organizer',
    organizationId: ids.organization,
  },
  {
    id: ids.audienceA,
    email: 'audience.one@ticketbox.local',
    fullName: 'Nguyen Minh Anh',
    role: 'audience',
    organizationId: null,
  },
  {
    id: ids.audienceB,
    email: 'audience.two@ticketbox.local',
    fullName: 'Tran Bao Chau',
    role: 'audience',
    organizationId: null,
  },
  {
    id: ids.audienceC,
    email: 'audience.three@ticketbox.local',
    fullName: 'Le Gia Huy',
    role: 'audience',
    organizationId: null,
  },
  {
    id: ids.scannerVip,
    email: 'scanner.vip@ticketbox.local',
    fullName: 'Scanner VIP Gate',
    role: 'scanner',
    organizationId: ids.organization,
  },
  {
    id: ids.scannerGuest,
    email: 'scanner.guest@ticketbox.local',
    fullName: 'Scanner Guest Gate',
    role: 'scanner',
    organizationId: ids.organization,
  },
];

const demoConcerts = [
  {
    id: ids.concertSayHi,
    title: 'Anh Trai Say Hi',
    slug: 'anh-trai-say-hi',
    venue: 'Saigon Exhibition Hall',
    artistName: 'Anh Trai Say Hi Ensemble',
    description:
      'Concert sân vận động với lượng truy cập cao, nhiều hạng vé và nhu cầu flash-sale.',
    startAt: new Date('2026-12-20T13:00:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/anh-trai-say-hi.svg',
    publishedArtistBio:
      'Anh Trai Say Hi là concert pop quy mô lớn với nhiều hạng vé và nhu cầu mua đồng thời rất cao.',
    publishedArtistProfiles: [
      {
        name: 'Anh Trai Say Hi Ensemble',
        role: 'Headliner',
        summary:
          'Đội hình nghệ sĩ trẻ theo phong cách pop-performance, phù hợp để demo flash sale và giới hạn vé theo tài khoản.',
      },
    ],
    posterObjectKey: `${ids.concertSayHi}-1.jpg`,
    posterFixture: 'say-hi-poster.png',
  },
  {
    id: ids.concertChiDep,
    title: 'Chị Đẹp Đạp Gió Rẽ Sóng',
    slug: 'chi-dep-dap-gio-re-song',
    venue: 'Hanoi Indoor Arena',
    artistName: 'Chi Dep Live Cast',
    description:
      'Concert phù hợp demo scanner, guest list VIP, notification và AI artist bio.',
    startAt: new Date('2026-11-15T12:30:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/chi-dep-dap-gio-re-song.svg',
    publishedArtistBio:
      'Chị Đẹp Đạp Gió Rẽ Sóng kết hợp band live, vũ đạo và sân khấu thiên về trải nghiệm sự kiện vận hành thực tế.',
    publishedArtistProfiles: [
      {
        name: 'Chi Dep Live Cast',
        role: 'Headliner',
        summary:
          'Tập thể nghệ sĩ được dùng để demo vận hành ngày diễn, scanner offline và guest list khu riêng.',
      },
    ],
    posterObjectKey: `${ids.concertChiDep}-1.jpg`,
    posterFixture: 'chi-dep-poster.png',
  },
  {
    id: ids.concertChongGai,
    title: 'Anh Trai Vượt Ngàn Chông Gai',
    slug: 'anh-trai-vuot-ngan-chong-gai',
    venue: 'Da Nang Riverfront Stage',
    artistName: 'Vuot Ngan Chong Gai Crew',
    description:
      'Concert mẫu có artist bio đã publish và còn room để demo ticket type management.',
    startAt: new Date('2027-01-10T12:00:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/anh-trai-vuot-ngan-chong-gai.svg',
    publishedArtistBio:
      'Anh Trai Vượt Ngàn Chông Gai là concert được dùng để minh họa thêm các trường hợp quản trị nội dung và loại vé.',
    publishedArtistProfiles: [
      {
        name: 'Vuot Ngan Chong Gai Crew',
        role: 'Headliner',
        summary:
          'Đội hình nhạc pop-rock với hồ sơ nghệ sĩ phù hợp để demo trang concert chi tiết và poster public.',
      },
    ],
    posterObjectKey: `${ids.concertChongGai}-1.jpg`,
    posterFixture: 'chong-gai-poster.png',
  },
  {
    id: ids.concertEmXinh,
    title: 'Em Xinh Say Hi',
    slug: 'em-xinh-say-hi',
    venue: 'Can Tho Riverside Plaza',
    artistName: 'Em Xinh Showcase',
    description:
      'Concert mẫu có dữ liệu bán vé cơ bản, phù hợp demo public listing và inventory summary.',
    startAt: new Date('2027-02-14T12:00:00.000Z'),
    status: 'published',
    seatingMapObjectKey: 'seating-maps/em-xinh-say-hi.svg',
    publishedArtistBio:
      'Em Xinh Say Hi hướng đến trải nghiệm showcase quy mô vừa, phù hợp cho các ca demo đọc nhiều, ghi ít.',
    publishedArtistProfiles: [
      {
        name: 'Em Xinh Showcase',
        role: 'Headliner',
        summary:
          'Dùng để minh họa public concert listing, detail caching và poster rendering.',
      },
    ],
    posterObjectKey: `${ids.concertEmXinh}-1.jpg`,
    posterFixture: 'em-xinh-poster.png',
  },
  {
    id: ids.concertCancelDemo,
    title: 'TicketBox Cancellation Drill',
    slug: 'ticketbox-cancellation-drill',
    venue: 'TicketBox Demo Hall',
    artistName: 'Operations Drill Cast',
    description:
      'Concert hủy sẵn để demo refund_required, revoke ticket, notification và dashboard vận hành.',
    startAt: new Date('2026-10-10T12:00:00.000Z'),
    status: 'canceled',
    seatingMapObjectKey: 'seating-maps/ticketbox-cancellation-drill.svg',
    publishedArtistBio:
      'Concert mô phỏng nghiệp vụ hủy sự kiện và xử lý hoàn tiền trong dashboard admin.',
    publishedArtistProfiles: [
      {
        name: 'Operations Drill Cast',
        role: 'Simulation',
        summary:
          'Dữ liệu được chuẩn bị sẵn để demo refund queue, canceled status và revoke ticket.',
      },
    ],
    posterObjectKey: `${ids.concertCancelDemo}-1.jpg`,
    posterFixture: 'say-hi-poster.png',
  },
];

const demoTicketTypes = [
  {
    id: '66666666-6666-4666-8666-666666666661',
    concertId: ids.concertSayHi,
    slug: 'svip',
    zoneCode: 'SVIP',
    name: 'SVIP',
    price: '3500000.00',
    capacity: 200,
    perUserLimit: 2,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-12-19T16:59:00.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666662',
    concertId: ids.concertSayHi,
    slug: 'vip',
    zoneCode: 'VIP',
    name: 'VIP',
    price: '2200000.00',
    capacity: 500,
    perUserLimit: 4,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-12-19T16:59:00.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666663',
    concertId: ids.concertSayHi,
    slug: 'cat-1',
    zoneCode: 'CAT1',
    name: 'CAT 1',
    price: '1400000.00',
    capacity: 1000,
    perUserLimit: 4,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-12-19T16:59:00.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666664',
    concertId: ids.concertSayHi,
    slug: 'cat-2',
    zoneCode: 'CAT2',
    name: 'CAT 2',
    price: '950000.00',
    capacity: 2000,
    perUserLimit: 6,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-12-19T16:59:00.000Z',
  },
  {
    id: '66666666-6666-4666-8666-666666666665',
    concertId: ids.concertSayHi,
    slug: 'ga',
    zoneCode: 'GA',
    name: 'General Admission',
    price: '650000.00',
    capacity: 5000,
    perUserLimit: 6,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-12-19T16:59:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777771',
    concertId: ids.concertChiDep,
    slug: 'vip',
    zoneCode: 'VIP',
    name: 'VIP',
    price: '2400000.00',
    capacity: 300,
    perUserLimit: 4,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-11-14T16:59:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777772',
    concertId: ids.concertChiDep,
    slug: 'cat-1',
    zoneCode: 'CAT1',
    name: 'CAT 1',
    price: '1600000.00',
    capacity: 900,
    perUserLimit: 4,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-11-14T16:59:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777773',
    concertId: ids.concertChiDep,
    slug: 'ga',
    zoneCode: 'GA',
    name: 'General Admission',
    price: '700000.00',
    capacity: 3000,
    perUserLimit: 6,
    saleStartAt: '2026-07-01T03:00:00.000Z',
    saleEndAt: '2026-11-14T16:59:00.000Z',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    concertId: ids.concertChongGai,
    slug: 'svip',
    zoneCode: 'SVIP',
    name: 'SVIP',
    price: '3200000.00',
    capacity: 150,
    perUserLimit: 2,
    saleStartAt: '2026-07-15T03:00:00.000Z',
    saleEndAt: '2027-01-09T16:59:00.000Z',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    concertId: ids.concertChongGai,
    slug: 'cat-1',
    zoneCode: 'CAT1',
    name: 'CAT 1',
    price: '1450000.00',
    capacity: 800,
    perUserLimit: 4,
    saleStartAt: '2026-07-15T03:00:00.000Z',
    saleEndAt: '2027-01-09T16:59:00.000Z',
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    concertId: ids.concertChongGai,
    slug: 'ga',
    zoneCode: 'GA',
    name: 'General Admission',
    price: '680000.00',
    capacity: 3500,
    perUserLimit: 6,
    saleStartAt: '2026-07-15T03:00:00.000Z',
    saleEndAt: '2027-01-09T16:59:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777781',
    concertId: ids.concertEmXinh,
    slug: 'vip',
    zoneCode: 'VIP',
    name: 'VIP',
    price: '1900000.00',
    capacity: 250,
    perUserLimit: 4,
    saleStartAt: '2026-08-01T03:00:00.000Z',
    saleEndAt: '2027-02-13T16:59:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777782',
    concertId: ids.concertEmXinh,
    slug: 'cat-1',
    zoneCode: 'CAT1',
    name: 'CAT 1',
    price: '1200000.00',
    capacity: 700,
    perUserLimit: 4,
    saleStartAt: '2026-08-01T03:00:00.000Z',
    saleEndAt: '2027-02-13T16:59:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777783',
    concertId: ids.concertEmXinh,
    slug: 'ga',
    zoneCode: 'GA',
    name: 'General Admission',
    price: '550000.00',
    capacity: 2800,
    perUserLimit: 6,
    saleStartAt: '2026-08-01T03:00:00.000Z',
    saleEndAt: '2027-02-13T16:59:00.000Z',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    concertId: ids.concertCancelDemo,
    slug: 'vip',
    zoneCode: 'VIP',
    name: 'VIP',
    price: '2100000.00',
    capacity: 50,
    perUserLimit: 4,
    saleStartAt: '2026-06-01T03:00:00.000Z',
    saleEndAt: '2026-10-09T16:59:00.000Z',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    concertId: ids.concertCancelDemo,
    slug: 'ga',
    zoneCode: 'GA',
    name: 'General Admission',
    price: '700000.00',
    capacity: 200,
    perUserLimit: 6,
    saleStartAt: '2026-06-01T03:00:00.000Z',
    saleEndAt: '2026-10-09T16:59:00.000Z',
  },
];

const commerceFixtures = {
  orders: [
    {
      id: '90000000-0000-4000-8000-000000000001',
      userId: ids.audienceA,
      status: 'issued',
      totalAmount: '7000000.00',
      idempotencyKey: 'seed-order-say-hi-issued',
      buyerFullName: 'Nguyen Minh Anh',
      buyerPhone: '0901111222',
      buyerEmail: 'audience.one@ticketbox.local',
    },
    {
      id: '90000000-0000-4000-8000-000000000002',
      userId: ids.audienceB,
      status: 'pending_payment',
      totalAmount: '4400000.00',
      idempotencyKey: 'seed-order-say-hi-pending',
      buyerFullName: 'Tran Bao Chau',
      buyerPhone: '0902222333',
      buyerEmail: 'audience.two@ticketbox.local',
    },
    {
      id: '90000000-0000-4000-8000-000000000003',
      userId: ids.audienceC,
      status: 'issued',
      totalAmount: '1600000.00',
      idempotencyKey: 'seed-order-chi-dep-checked-in',
      buyerFullName: 'Le Gia Huy',
      buyerPhone: '0903333444',
      buyerEmail: 'audience.three@ticketbox.local',
    },
    {
      id: '90000000-0000-4000-8000-000000000004',
      userId: ids.audienceB,
      status: 'issued',
      totalAmount: '4800000.00',
      idempotencyKey: 'seed-order-chi-dep-scanner-demo',
      buyerFullName: 'Tran Bao Chau',
      buyerPhone: '0902222333',
      buyerEmail: 'audience.two@ticketbox.local',
    },
    {
      id: '90000000-0000-4000-8000-000000000005',
      userId: ids.audienceA,
      status: 'refund_required',
      totalAmount: '4200000.00',
      idempotencyKey: 'seed-order-cancel-refund',
      buyerFullName: 'Nguyen Minh Anh',
      buyerPhone: '0901111222',
      buyerEmail: 'audience.one@ticketbox.local',
    },
    {
      id: '90000000-0000-4000-8000-000000000006',
      userId: ids.audienceC,
      status: 'expired',
      totalAmount: '700000.00',
      idempotencyKey: 'seed-order-cancel-expired',
      buyerFullName: 'Le Gia Huy',
      buyerPhone: '0903333444',
      buyerEmail: 'audience.three@ticketbox.local',
    },
  ],
  reservations: [
    {
      id: '91000000-0000-4000-8000-000000000001',
      userId: ids.audienceA,
      ticketTypeId: '66666666-6666-4666-8666-666666666661',
      quantity: 2,
      orderId: '90000000-0000-4000-8000-000000000001',
      status: 'confirmed',
      expiresAt: '2026-07-01T03:20:00.000Z',
      idempotencyKey: 'seed-reservation-say-hi-issued',
    },
    {
      id: '91000000-0000-4000-8000-000000000002',
      userId: ids.audienceB,
      ticketTypeId: '66666666-6666-4666-8666-666666666662',
      quantity: 2,
      orderId: '90000000-0000-4000-8000-000000000002',
      status: 'active',
      expiresAt: '2027-12-19T16:00:00.000Z',
      idempotencyKey: 'seed-reservation-say-hi-pending',
    },
    {
      id: '91000000-0000-4000-8000-000000000003',
      userId: ids.audienceC,
      ticketTypeId: '77777777-7777-4777-8777-777777777772',
      quantity: 1,
      orderId: '90000000-0000-4000-8000-000000000003',
      status: 'confirmed',
      expiresAt: '2026-08-01T10:10:00.000Z',
      idempotencyKey: 'seed-reservation-chi-dep-checked-in',
    },
    {
      id: '91000000-0000-4000-8000-000000000004',
      userId: ids.audienceB,
      ticketTypeId: '77777777-7777-4777-8777-777777777771',
      quantity: 2,
      orderId: '90000000-0000-4000-8000-000000000004',
      status: 'confirmed',
      expiresAt: '2026-08-01T10:15:00.000Z',
      idempotencyKey: 'seed-reservation-chi-dep-scanner-demo',
    },
    {
      id: '91000000-0000-4000-8000-000000000005',
      userId: ids.audienceA,
      ticketTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      quantity: 2,
      orderId: '90000000-0000-4000-8000-000000000005',
      status: 'confirmed',
      expiresAt: '2026-06-15T10:00:00.000Z',
      idempotencyKey: 'seed-reservation-cancel-refund',
    },
    {
      id: '91000000-0000-4000-8000-000000000006',
      userId: ids.audienceC,
      ticketTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      quantity: 1,
      orderId: '90000000-0000-4000-8000-000000000006',
      status: 'expired',
      expiresAt: '2026-06-20T10:00:00.000Z',
      idempotencyKey: 'seed-reservation-cancel-expired',
    },
  ],
  payments: [
    {
      id: '92000000-0000-4000-8000-000000000001',
      orderId: '90000000-0000-4000-8000-000000000001',
      provider: 'mock',
      providerTxnId: 'mock-seed-1',
      providerIntentId: 'mock-intent-seed-1',
      providerIdempotencyKey: 'payment-provider-seed-1',
      checkoutUrl: 'https://ticketbox.local/mock-checkout/1',
      status: 'succeeded',
      payloadHash: 'seed-payment-hash-1',
    },
    {
      id: '92000000-0000-4000-8000-000000000002',
      orderId: '90000000-0000-4000-8000-000000000002',
      provider: 'VNPAY',
      providerTxnId: null,
      providerIntentId: 'vnpay-intent-seed-2',
      providerIdempotencyKey: 'payment-provider-seed-2',
      checkoutUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?seed=2',
      status: 'created',
      payloadHash: null,
    },
    {
      id: '92000000-0000-4000-8000-000000000003',
      orderId: '90000000-0000-4000-8000-000000000003',
      provider: 'mock',
      providerTxnId: 'mock-seed-3',
      providerIntentId: 'mock-intent-seed-3',
      providerIdempotencyKey: 'payment-provider-seed-3',
      checkoutUrl: 'https://ticketbox.local/mock-checkout/3',
      status: 'succeeded',
      payloadHash: 'seed-payment-hash-3',
    },
    {
      id: '92000000-0000-4000-8000-000000000004',
      orderId: '90000000-0000-4000-8000-000000000004',
      provider: 'mock',
      providerTxnId: 'mock-seed-4',
      providerIntentId: 'mock-intent-seed-4',
      providerIdempotencyKey: 'payment-provider-seed-4',
      checkoutUrl: 'https://ticketbox.local/mock-checkout/4',
      status: 'succeeded',
      payloadHash: 'seed-payment-hash-4',
    },
    {
      id: '92000000-0000-4000-8000-000000000005',
      orderId: '90000000-0000-4000-8000-000000000005',
      provider: 'VNPAY',
      providerTxnId: 'vnpay-seed-5',
      providerIntentId: 'vnpay-intent-seed-5',
      providerIdempotencyKey: 'payment-provider-seed-5',
      checkoutUrl: 'https://ticketbox.local/mock-checkout/5',
      status: 'succeeded',
      payloadHash: 'seed-payment-hash-5',
    },
    {
      id: '92000000-0000-4000-8000-000000000006',
      orderId: '90000000-0000-4000-8000-000000000006',
      provider: 'mock',
      providerTxnId: null,
      providerIntentId: 'mock-intent-seed-6',
      providerIdempotencyKey: 'payment-provider-seed-6',
      checkoutUrl: null,
      status: 'expired',
      payloadHash: null,
    },
  ],
  orderItems: [
    {
      id: '93000000-0000-4000-8000-000000000001',
      orderId: '90000000-0000-4000-8000-000000000001',
      reservationId: '91000000-0000-4000-8000-000000000001',
      ticketTypeId: '66666666-6666-4666-8666-666666666661',
      quantity: 2,
      unitPrice: '3500000.00',
      subtotalAmount: '7000000.00',
      status: 'issued',
    },
    {
      id: '93000000-0000-4000-8000-000000000002',
      orderId: '90000000-0000-4000-8000-000000000002',
      reservationId: '91000000-0000-4000-8000-000000000002',
      ticketTypeId: '66666666-6666-4666-8666-666666666662',
      quantity: 2,
      unitPrice: '2200000.00',
      subtotalAmount: '4400000.00',
      status: 'pending_payment',
    },
    {
      id: '93000000-0000-4000-8000-000000000003',
      orderId: '90000000-0000-4000-8000-000000000003',
      reservationId: '91000000-0000-4000-8000-000000000003',
      ticketTypeId: '77777777-7777-4777-8777-777777777772',
      quantity: 1,
      unitPrice: '1600000.00',
      subtotalAmount: '1600000.00',
      status: 'checked_in',
    },
    {
      id: '93000000-0000-4000-8000-000000000004',
      orderId: '90000000-0000-4000-8000-000000000004',
      reservationId: '91000000-0000-4000-8000-000000000004',
      ticketTypeId: '77777777-7777-4777-8777-777777777771',
      quantity: 2,
      unitPrice: '2400000.00',
      subtotalAmount: '4800000.00',
      status: 'issued',
    },
    {
      id: '93000000-0000-4000-8000-000000000005',
      orderId: '90000000-0000-4000-8000-000000000005',
      reservationId: '91000000-0000-4000-8000-000000000005',
      ticketTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      quantity: 2,
      unitPrice: '2100000.00',
      subtotalAmount: '4200000.00',
      status: 'refund_required',
    },
    {
      id: '93000000-0000-4000-8000-000000000006',
      orderId: '90000000-0000-4000-8000-000000000006',
      reservationId: '91000000-0000-4000-8000-000000000006',
      ticketTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      quantity: 1,
      unitPrice: '700000.00',
      subtotalAmount: '700000.00',
      status: 'expired',
    },
  ],
  tickets: [
    {
      id: '94000000-0000-4000-8000-000000000001',
      orderId: '90000000-0000-4000-8000-000000000001',
      orderItemId: '93000000-0000-4000-8000-000000000001',
      ticketTypeId: '66666666-6666-4666-8666-666666666661',
      ownerUserId: ids.audienceA,
      sequenceNo: 1,
      status: 'issued',
      qrToken: 'qr-say-hi-svip-1',
    },
    {
      id: '94000000-0000-4000-8000-000000000002',
      orderId: '90000000-0000-4000-8000-000000000001',
      orderItemId: '93000000-0000-4000-8000-000000000001',
      ticketTypeId: '66666666-6666-4666-8666-666666666661',
      ownerUserId: ids.audienceA,
      sequenceNo: 2,
      status: 'issued',
      qrToken: 'qr-say-hi-svip-2',
    },
    {
      id: '94000000-0000-4000-8000-000000000003',
      orderId: '90000000-0000-4000-8000-000000000003',
      orderItemId: '93000000-0000-4000-8000-000000000003',
      ticketTypeId: '77777777-7777-4777-8777-777777777772',
      ownerUserId: ids.audienceC,
      sequenceNo: 1,
      status: 'checked_in',
      qrToken: 'qr-chi-dep-cat1-checked-in',
    },
    {
      id: '94000000-0000-4000-8000-000000000004',
      orderId: '90000000-0000-4000-8000-000000000004',
      orderItemId: '93000000-0000-4000-8000-000000000004',
      ticketTypeId: '77777777-7777-4777-8777-777777777771',
      ownerUserId: ids.audienceB,
      sequenceNo: 1,
      status: 'issued',
      qrToken: 'qr-chi-dep-vip-1',
    },
    {
      id: '94000000-0000-4000-8000-000000000005',
      orderId: '90000000-0000-4000-8000-000000000004',
      orderItemId: '93000000-0000-4000-8000-000000000004',
      ticketTypeId: '77777777-7777-4777-8777-777777777771',
      ownerUserId: ids.audienceB,
      sequenceNo: 2,
      status: 'issued',
      qrToken: 'qr-chi-dep-vip-2',
    },
    {
      id: '94000000-0000-4000-8000-000000000006',
      orderId: '90000000-0000-4000-8000-000000000005',
      orderItemId: '93000000-0000-4000-8000-000000000005',
      ticketTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      ownerUserId: ids.audienceA,
      sequenceNo: 1,
      status: 'revoked',
      qrToken: 'qr-cancel-demo-vip-1',
    },
    {
      id: '94000000-0000-4000-8000-000000000007',
      orderId: '90000000-0000-4000-8000-000000000005',
      orderItemId: '93000000-0000-4000-8000-000000000005',
      ticketTypeId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      ownerUserId: ids.audienceA,
      sequenceNo: 2,
      status: 'revoked',
      qrToken: 'qr-cancel-demo-vip-2',
    },
  ],
};

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function hashQrToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function ensureDir(pathValue) {
  if (!existsSync(pathValue)) {
    mkdirSync(pathValue, { recursive: true });
  }
}

function assetPath(...parts) {
  return resolve(__dirname, '..', '..', '..', ...parts);
}

async function resetDemoData() {
  const seededConcertIds = demoConcerts.map((concert) => concert.id);
  const existingDemoConcerts = await prisma.concert.findMany({
    where: {
      OR: [
        { organizationId: ids.organization },
        { id: { in: seededConcertIds } },
      ],
    },
    select: { id: true },
  });
  const concertIds = [
    ...new Set([
      ...seededConcertIds,
      ...existingDemoConcerts.map((concert) => concert.id),
    ]),
  ];
  const userIds = demoUsers.map((user) => user.id);

  const existingTicketTypes = await prisma.ticketType.findMany({
    where: { concertId: { in: concertIds } },
    select: { id: true },
  });
  const existingTicketTypeIds = [
    ...new Set([
      ...demoTicketTypes.map((ticketType) => ticketType.id),
      ...existingTicketTypes.map((ticketType) => ticketType.id),
    ]),
  ];

  const existingOrders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          ticketType: {
            concertId: { in: concertIds },
          },
        },
      },
    },
    select: { id: true },
  });
  const orderIds = [
    ...new Set([
      ...commerceFixtures.orders.map((order) => order.id),
      ...existingOrders.map((order) => order.id),
    ]),
  ];

  const existingGuestVersions = await prisma.guestListVersion.findMany({
    where: { concertId: { in: concertIds } },
    select: { id: true },
  });
  const guestVersionIds = existingGuestVersions.map((version) => version.id);

  await prisma.checkInEvent.deleteMany({
    where: {
      OR: [
        { concertId: { in: concertIds } },
        { eventId: { in: concertIds } },
        { assignment: { concertId: { in: concertIds } } },
      ],
    },
  });

  await prisma.scannerGuestEntry.deleteMany({
    where: { concertId: { in: concertIds } },
  });
  await prisma.scannerRevokedTicket.deleteMany({
    where: { concertId: { in: concertIds } },
  });
  await prisma.scannerManifestTicket.deleteMany({
    where: { concertId: { in: concertIds } },
  });
  await prisma.scannerAssignment.deleteMany({
    where: { concertId: { in: concertIds } },
  });
  await prisma.scannerDevice.deleteMany({
    where: { scannerUserId: { in: [ids.scannerVip, ids.scannerGuest] } },
  });

  await prisma.notificationRecord.deleteMany({
    where: {
      OR: [
        { concertId: { in: concertIds } },
        { orderId: { in: orderIds } },
        { ownerUserId: { in: userIds } },
      ],
    },
  });

  await prisma.paymentProviderEvent.deleteMany({
    where: { orderId: { in: orderIds } },
  });

  await prisma.ticket.deleteMany({
    where: {
      OR: [
        { orderId: { in: orderIds } },
        { ticketTypeId: { in: existingTicketTypeIds } },
      ],
    },
  });

  await prisma.orderItem.deleteMany({
    where: { orderId: { in: orderIds } },
  });

  await prisma.payment.deleteMany({
    where: { orderId: { in: orderIds } },
  });

  await prisma.reservation.deleteMany({
    where: {
      OR: [
        { orderId: { in: orderIds } },
        { ticketTypeId: { in: existingTicketTypeIds } },
      ],
    },
  });

  await prisma.order.deleteMany({
    where: { id: { in: orderIds } },
  });

  await prisma.userTicketQuota.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { ticketTypeId: { in: existingTicketTypeIds } },
      ],
    },
  });

  await prisma.guestEntry.deleteMany({
    where: {
      OR: [
        { versionId: { in: guestVersionIds } },
        { ticketTypeId: { in: existingTicketTypeIds } },
      ],
    },
  });

  await prisma.guestListOutbox.deleteMany({
    where: {
      OR: [
        { aggregateId: { in: concertIds } },
        { aggregateId: { in: guestVersionIds } },
      ],
    },
  });

  await prisma.guestListVersion.deleteMany({
    where: { concertId: { in: concertIds } },
  });

  await prisma.guestEntryStaging.deleteMany({
    where: {
      batch: {
        concertId: { in: concertIds },
      },
    },
  });

  await prisma.guestListBatch.deleteMany({
    where: { concertId: { in: concertIds } },
  });

  await prisma.artistBioDraft.deleteMany({
    where: { concertId: { in: concertIds } },
  });

  await prisma.artistBioJob.deleteMany({
    where: { concertId: { in: concertIds } },
  });

  await prisma.inventoryCounter.deleteMany({
    where: { ticketTypeId: { in: existingTicketTypeIds } },
  });

  await prisma.ticketType.deleteMany({
    where: { concertId: { in: concertIds } },
  });

  await prisma.concert.deleteMany({
    where: { id: { in: concertIds } },
  });

}

async function seedOrganization() {
  await prisma.organization.upsert({
    where: { id: ids.organization },
    create: {
      id: ids.organization,
      name: 'TicketBox Demo Organizer',
    },
    update: {
      name: 'TicketBox Demo Organizer',
    },
  });
}

async function seedUsers() {
  const passwordHash = hashPassword('Password123!');

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: 'active',
        passwordHash,
      },
      update: {
        organizationId: user.organizationId,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: 'active',
        passwordHash,
      },
    });
  }
}

async function seedConcerts() {
  for (const concert of demoConcerts) {
    await prisma.concert.create({
      data: {
        id: concert.id,
        organizationId: ids.organization,
        title: concert.title,
        slug: concert.slug,
        venue: concert.venue,
        artistName: concert.artistName,
        description: concert.description,
        startAt: concert.startAt,
        status: concert.status,
        seatingMapObjectKey: concert.seatingMapObjectKey,
        publishedArtistBio: concert.publishedArtistBio,
        publishedArtistProfiles: concert.publishedArtistProfiles,
        posterObjectKey: concert.posterObjectKey,
      },
    });
  }
}

function seedPosterFixtures() {
  const storageDir = resolve(
    process.env.CONCERT_POSTER_STORAGE_DIR ?? 'storage/concert-posters',
  );
  ensureDir(storageDir);

  const assetsDir = assetPath('data', 'images');

  for (const concert of demoConcerts) {
    const sourcePath = join(assetsDir, concert.posterFixture);
    const destPath = join(storageDir, concert.posterObjectKey);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing concert poster seed asset: ${sourcePath}`);
    }

    assertJpegFixture(sourcePath);
    copyFileSync(sourcePath, destPath);
  }
}

function assertJpegFixture(sourcePath) {
  const header = readFileSync(sourcePath).subarray(0, 3);
  if (header[0] !== 0xff || header[1] !== 0xd8 || header[2] !== 0xff) {
    throw new Error(
      `Concert poster fixture must contain JPEG bytes for its .jpg object key: ${sourcePath}`,
    );
  }
}

async function seedTicketTypes() {
  for (const ticketType of demoTicketTypes) {
    await prisma.ticketType.create({
      data: {
        id: ticketType.id,
        concertId: ticketType.concertId,
        slug: ticketType.slug,
        zoneCode: ticketType.zoneCode,
        name: ticketType.name,
        price: ticketType.price,
        capacity: ticketType.capacity,
        perUserLimit: ticketType.perUserLimit,
        saleStartAt: new Date(ticketType.saleStartAt),
        saleEndAt: new Date(ticketType.saleEndAt),
      },
    });
  }

  await prisma.inventoryCounter.createMany({
    data: demoTicketTypes.map((ticketType) => ({
      ticketTypeId: ticketType.id,
      totalCapacity: ticketType.capacity,
      reservedCount: 0,
      soldCount: 0,
      version: 0,
    })),
  });
}

async function seedCommerce() {
  await prisma.order.createMany({
    data: commerceFixtures.orders.map((order) => ({
      ...order,
      createdAt: new Date('2026-07-05T10:00:00.000Z'),
      updatedAt: new Date('2026-07-05T10:05:00.000Z'),
    })),
  });

  await prisma.reservation.createMany({
    data: commerceFixtures.reservations.map((reservation) => ({
      ...reservation,
      expiresAt: new Date(reservation.expiresAt),
      createdAt: new Date('2026-07-05T10:00:00.000Z'),
      updatedAt: new Date('2026-07-05T10:05:00.000Z'),
    })),
  });

  await prisma.payment.createMany({
    data: commerceFixtures.payments.map((payment) => ({
      ...payment,
      uncertainSince: null,
      reconciliationAfter: null,
      reconciliationAttempts: 0,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastProviderError: null,
      lastProviderAttemptAt: new Date('2026-07-05T10:05:00.000Z'),
      createdAt: new Date('2026-07-05T10:02:00.000Z'),
      updatedAt: new Date('2026-07-05T10:05:00.000Z'),
    })),
  });

  await prisma.orderItem.createMany({
    data: commerceFixtures.orderItems,
  });

  await prisma.ticket.createMany({
    data: commerceFixtures.tickets.map((ticket) => ({
      ...ticket,
      qrTokenHash: hashQrToken(ticket.qrToken),
      createdAt: new Date('2026-07-05T10:05:00.000Z'),
      updatedAt: new Date('2026-07-05T10:05:00.000Z'),
    })),
  });
}

async function syncInventoryAndQuotas() {
  for (const ticketType of demoTicketTypes) {
    const [reservedAgg, confirmedAgg] = await Promise.all([
      prisma.reservation.aggregate({
        where: {
          ticketTypeId: ticketType.id,
          status: 'active',
        },
        _sum: { quantity: true },
      }),
      prisma.reservation.aggregate({
        where: {
          ticketTypeId: ticketType.id,
          status: 'confirmed',
        },
        _sum: { quantity: true },
      }),
    ]);

    await prisma.inventoryCounter.update({
      where: { ticketTypeId: ticketType.id },
      data: {
        totalCapacity: ticketType.capacity,
        reservedCount: reservedAgg._sum.quantity ?? 0,
        soldCount: confirmedAgg._sum.quantity ?? 0,
        version: 1,
      },
    });
  }

  for (const user of demoUsers.filter((item) => item.role === 'audience')) {
    for (const ticketType of demoTicketTypes) {
      const [reservedAgg, paidAgg] = await Promise.all([
        prisma.reservation.aggregate({
          where: {
            userId: user.id,
            ticketTypeId: ticketType.id,
            status: 'active',
          },
          _sum: { quantity: true },
        }),
        prisma.reservation.aggregate({
          where: {
            userId: user.id,
            ticketTypeId: ticketType.id,
            status: 'confirmed',
          },
          _sum: { quantity: true },
        }),
      ]);

      if ((reservedAgg._sum.quantity ?? 0) === 0 && (paidAgg._sum.quantity ?? 0) === 0) {
        continue;
      }

      await prisma.userTicketQuota.create({
        data: {
          userId: user.id,
          ticketTypeId: ticketType.id,
          reservedCount: reservedAgg._sum.quantity ?? 0,
          paidCount: paidAgg._sum.quantity ?? 0,
        },
      });
    }
  }
}

async function seedGuestListDemo() {
  const guestListStorageDir = resolve('storage/guest-lists');
  ensureDir(guestListStorageDir);

  const publishedBatchId = '95000000-0000-4000-8000-000000000001';
  const publishedVersionId = '95000000-0000-4000-8000-000000000002';
  const failedBatchId = '95000000-0000-4000-8000-000000000003';
  const publishedObjectKey = `${ids.concertChiDep}-guest-list-published.csv`;
  const failedObjectKey = `${ids.concertChiDep}-guest-list-invalid.csv`;

  copyFileSync(
    assetPath('docs', 'test-data', 'admin-guest-list-summer-live.csv'),
    join(guestListStorageDir, publishedObjectKey),
  );
  copyFileSync(
    assetPath(
      'docs',
      'test-data',
      'guest-list-scenarios',
      '12-invalid-zone-ticket-mismatch.csv',
    ),
    join(guestListStorageDir, failedObjectKey),
  );

  await prisma.guestListBatch.create({
    data: {
      id: publishedBatchId,
      concertId: ids.concertChiDep,
      fileChecksum: createHash('sha256')
        .update('seed-published-guest-list')
        .digest('hex'),
      schemaVersion: 'guest-list.v1',
      rawObjectKey: publishedObjectKey,
      originalName: 'chi-dep-vip-guest-list.csv',
      status: 'published',
      summary: {
        totalRows: 2,
        validRows: 2,
        invalidRows: 0,
        duplicateRows: 0,
        delimiter: ',',
        schemaVersion: 'guest-list.v1',
      },
    },
  });

  await prisma.guestEntryStaging.createMany({
    data: [
      {
        id: '95000000-0000-4000-8000-000000000011',
        batchId: publishedBatchId,
        rowNumber: 1,
        fullName: 'Pham Gia Linh',
        email: 'guest.one@ticketbox.local',
        phone: '0904444555',
        sponsorId: 'SPONSOR-A',
        identityKey: 'email:guest.one@ticketbox.local',
        zoneCode: 'GUEST-LIST',
        ticketTypeSlug: null,
        ticketTypeId: null,
        status: 'valid',
        errorReason: null,
        rawRow: {
          full_name: 'Pham Gia Linh',
          email: 'guest.one@ticketbox.local',
          phone: '0904444555',
          sponsor_id: 'SPONSOR-A',
        },
      },
      {
        id: '95000000-0000-4000-8000-000000000012',
        batchId: publishedBatchId,
        rowNumber: 2,
        fullName: 'Vo Hai Dang',
        email: null,
        phone: '0905555666',
        sponsorId: 'SPONSOR-B',
        identityKey: 'phone:0905555666',
        zoneCode: 'GUEST-LIST',
        ticketTypeSlug: null,
        ticketTypeId: null,
        status: 'valid',
        errorReason: null,
        rawRow: {
          full_name: 'Vo Hai Dang',
          phone: '0905555666',
          sponsor_id: 'SPONSOR-B',
        },
      },
    ],
  });

  await prisma.guestListVersion.create({
    data: {
      id: publishedVersionId,
      concertId: ids.concertChiDep,
      batchId: publishedBatchId,
      versionNo: 1,
      isActive: true,
      checksum: createHash('sha256').update('seed-guest-version-1').digest('hex'),
      entryCount: 2,
      publishedAt: new Date('2026-09-01T10:00:00.000Z'),
    },
  });

  await prisma.guestEntry.createMany({
    data: [
      {
        id: '95000000-0000-4000-8000-000000000021',
        versionId: publishedVersionId,
        ticketTypeId: null,
        fullName: 'Pham Gia Linh',
        email: 'guest.one@ticketbox.local',
        phone: '0904444555',
        sponsorId: 'SPONSOR-A',
        identityKey: 'email:guest.one@ticketbox.local',
        zoneCode: 'GUEST-LIST',
      },
      {
        id: '95000000-0000-4000-8000-000000000022',
        versionId: publishedVersionId,
        ticketTypeId: null,
        fullName: 'Vo Hai Dang',
        email: null,
        phone: '0905555666',
        sponsorId: 'SPONSOR-B',
        identityKey: 'phone:0905555666',
        zoneCode: 'GUEST-LIST',
      },
    ],
  });

  await prisma.guestListOutbox.create({
    data: {
      id: '95000000-0000-4000-8000-000000000031',
      eventType: 'GuestListUpdated',
      aggregateId: publishedVersionId,
      payload: {
        concertId: ids.concertChiDep,
        versionId: publishedVersionId,
        versionNo: 1,
        checksum: createHash('sha256').update('seed-guest-version-1').digest('hex'),
        entryCount: 2,
        zoneCode: 'GUEST-LIST',
      },
      status: 'published',
      publishedAt: new Date('2026-09-01T10:05:00.000Z'),
    },
  });

  await prisma.guestListBatch.create({
    data: {
      id: failedBatchId,
      concertId: ids.concertChiDep,
      fileChecksum: createHash('sha256')
        .update('seed-invalid-guest-list')
        .digest('hex'),
      schemaVersion: 'guest-list.v1',
      rawObjectKey: failedObjectKey,
      originalName: 'chi-dep-vip-guest-list-invalid.csv',
      status: 'validation_failed',
      summary: {
        totalRows: 2,
        validRows: 0,
        invalidRows: 2,
        duplicateRows: 0,
        delimiter: ',',
        schemaVersion: 'guest-list.v1',
      },
    },
  });

  await prisma.guestEntryStaging.createMany({
    data: [
      {
        id: '95000000-0000-4000-8000-000000000041',
        batchId: failedBatchId,
        rowNumber: 1,
        fullName: 'Invalid Guest 1',
        email: null,
        phone: null,
        sponsorId: null,
        identityKey: null,
        zoneCode: 'GUEST-LIST',
        ticketTypeSlug: null,
        ticketTypeId: null,
        status: 'invalid',
        errorReason: 'email, phone, or sponsor_id is required',
        rawRow: {
          full_name: 'Invalid Guest 1',
        },
      },
      {
        id: '95000000-0000-4000-8000-000000000042',
        batchId: failedBatchId,
        rowNumber: 2,
        fullName: null,
        email: 'guest.one@ticketbox.local',
        phone: null,
        sponsorId: null,
        identityKey: 'email:guest.one@ticketbox.local',
        zoneCode: 'GUEST-LIST',
        ticketTypeSlug: null,
        ticketTypeId: null,
        status: 'invalid',
        errorReason: 'full_name is required; guest identity already exists in active guest list',
        rawRow: {
          email: 'guest.one@ticketbox.local',
        },
      },
    ],
  });
}

async function seedArtistBioDemo() {
  const artistBioStorageDir = resolve('storage/artist-bios');
  ensureDir(artistBioStorageDir);

  const readyJobId = '96000000-0000-4000-8000-000000000001';
  const readyDraftId = '96000000-0000-4000-8000-000000000002';
  const failedJobId = '96000000-0000-4000-8000-000000000003';
  const readyObjectKey = `${ids.concertChiDep}-artist-bio.pdf`;
  const failedObjectKey = `${ids.concertEmXinh}-artist-bio.pdf`;

  copyFileSync(
    assetPath('docs', 'test-data', 'artist-press-kit-summer-live.pdf'),
    join(artistBioStorageDir, readyObjectKey),
  );
  copyFileSync(
    assetPath('docs', 'test-data', 'artist-press-kit-multi-artist-test.pdf'),
    join(artistBioStorageDir, failedObjectKey),
  );

  await prisma.artistBioJob.create({
    data: {
      id: readyJobId,
      concertId: ids.concertChiDep,
      fileChecksum: createHash('sha256').update('seed-artist-bio-ready').digest('hex'),
      pipelineVersion: 'artist-bio.v1',
      rawObjectKey: readyObjectKey,
      originalName: 'chi-dep-press-kit.pdf',
      sourceMimeType: 'application/pdf',
      status: 'draft_ready',
      attemptCount: 1,
      maxAttempts: 3,
      nextAttemptAt: new Date('2026-09-01T09:00:00.000Z'),
      completedAt: new Date('2026-09-01T09:05:00.000Z'),
      extractedText:
        'Chi Dep press kit extracted text for seed demo.',
      sanitizedText:
        'Chi Dep sanitized artist bio content used for preview.',
      providerVersion: 'gemini-adapter.v1',
      modelVersion: 'gemini-2.5-flash',
      promptVersion: 'prompt.v1',
    },
  });

  await prisma.artistBioDraft.create({
    data: {
      id: readyDraftId,
      concertId: ids.concertChiDep,
      jobId: readyJobId,
      content:
        'Bản draft AI giới thiệu Chị Đẹp Đạp Gió Rẽ Sóng, chờ organizer review trước khi publish.',
      artistProfiles: [
        {
          name: 'Chi Dep Live Cast',
          role: 'Headliner',
          summary:
            'Draft generated from PDF press kit, ready for organizer review in admin UI.',
        },
      ],
      reviewStatus: 'pending_review',
      providerVersion: 'gemini-adapter.v1',
      modelVersion: 'gemini-2.5-flash',
      promptVersion: 'prompt.v1',
    },
  });

  await prisma.artistBioJob.create({
    data: {
      id: failedJobId,
      concertId: ids.concertEmXinh,
      fileChecksum: createHash('sha256').update('seed-artist-bio-failed').digest('hex'),
      pipelineVersion: 'artist-bio.v1',
      rawObjectKey: failedObjectKey,
      originalName: 'em-xinh-press-kit.pdf',
      sourceMimeType: 'application/pdf',
      status: 'failed',
      attemptCount: 3,
      maxAttempts: 3,
      nextAttemptAt: new Date('2026-09-02T09:00:00.000Z'),
      completedAt: new Date('2026-09-02T09:04:00.000Z'),
      lastError: 'Gemini request failed while generating artist profile summary.',
      lastErrorAt: new Date('2026-09-02T09:04:00.000Z'),
      extractedText: 'Em Xinh press kit extracted text for retry demo.',
      sanitizedText: 'Em Xinh sanitized content for retry demo.',
      providerVersion: 'gemini-adapter.v1',
      modelVersion: 'gemini-2.5-flash',
      promptVersion: 'prompt.v1',
    },
  });
}

async function seedNotificationDemo() {
  await prisma.notificationRecord.createMany({
    data: [
      {
        id: '97000000-0000-4000-8000-000000000001',
        organizationId: ids.organization,
        eventType: 'TicketIssued',
        notificationType: 'TicketIssued',
        concertId: ids.concertSayHi,
        orderId: '90000000-0000-4000-8000-000000000001',
        ownerUserId: ids.audienceA,
        ticketCount: 2,
        channel: 'in_app',
        status: 'sent',
        idempotencyKey: 'seed-ticket-issued-order-1-in-app',
        message: 'Issued 2 ticket(s) for Anh Trai Say Hi.',
        scheduledFor: new Date('2026-07-05T10:06:00.000Z'),
        processedAt: new Date('2026-07-05T10:06:10.000Z'),
      },
      {
        id: '97000000-0000-4000-8000-000000000002',
        organizationId: ids.organization,
        eventType: 'TicketIssued',
        notificationType: 'TicketIssued',
        concertId: ids.concertChiDep,
        orderId: '90000000-0000-4000-8000-000000000004',
        ownerUserId: ids.audienceB,
        ticketCount: 2,
        channel: 'email',
        status: 'sent',
        idempotencyKey: 'seed-ticket-issued-order-4-email',
        message: 'Issued 2 ticket(s) for Chị Đẹp Đạp Gió Rẽ Sóng.',
        scheduledFor: new Date('2026-07-05T10:07:00.000Z'),
        processedAt: new Date('2026-07-05T10:07:12.000Z'),
      },
      {
        id: '97000000-0000-4000-8000-000000000003',
        organizationId: ids.organization,
        eventType: 'ConcertReminder24h',
        notificationType: 'ConcertReminder24h',
        concertId: ids.concertChiDep,
        orderId: null,
        ownerUserId: ids.audienceB,
        ticketCount: null,
        channel: 'in_app',
        status: 'pending',
        idempotencyKey: 'seed-reminder-chi-dep-audience-b',
        message: 'Reminder: Chị Đẹp Đạp Gió Rẽ Sóng starts soon.',
        scheduledFor: new Date('2026-11-14T12:30:00.000Z'),
        processedAt: null,
      },
      {
        id: '97000000-0000-4000-8000-000000000004',
        organizationId: ids.organization,
        eventType: 'ConcertCanceledRefundRequired',
        notificationType: 'ConcertCanceledRefundRequired',
        concertId: ids.concertCancelDemo,
        orderId: '90000000-0000-4000-8000-000000000005',
        ownerUserId: ids.audienceA,
        ticketCount: 2,
        channel: 'email',
        status: 'pending',
        idempotencyKey: 'seed-cancel-refund-order-5-email',
        message:
          'Concert TicketBox Cancellation Drill has been canceled. Order 90000000-0000-4000-8000-000000000005 requires refund handling.',
        scheduledFor: new Date('2026-10-01T08:05:00.000Z'),
        processedAt: null,
      },
    ],
  });
}

async function seedScannerDemo() {
  const vipDeviceId = '98000000-0000-4000-8000-000000000001';
  const guestDeviceId = '98000000-0000-4000-8000-000000000002';
  const vipAssignmentId = '98000000-0000-4000-8000-000000000011';

  await prisma.scannerDevice.createMany({
    data: [
      {
        id: vipDeviceId,
        deviceCode: 'DEV-DEMO-VIP-001',
        scannerUserId: ids.scannerVip,
        status: 'active',
        lastSeenAt: new Date('2026-10-20T08:00:00.000Z'),
      },
      {
        id: guestDeviceId,
        deviceCode: 'DEV-DEMO-GUEST-001',
        scannerUserId: ids.scannerGuest,
        status: 'revoked',
        lastSeenAt: new Date('2026-09-01T08:00:00.000Z'),
      },
    ],
  });

  await prisma.scannerAssignment.create({
    data: {
      id: vipAssignmentId,
      deviceId: vipDeviceId,
      scannerUserId: ids.scannerVip,
      eventId: ids.concertChiDep,
      concertId: ids.concertChiDep,
      gateCode: 'GATE_MAIN',
      zoneCode: 'VIP',
      status: 'active',
      manifestVersion: 3,
      manifestIssuedAt: new Date('2026-10-20T07:55:00.000Z'),
      manifestExpiresAt: new Date('2026-11-15T15:00:00.000Z'),
    },
  });

  await prisma.scannerManifestTicket.createMany({
    data: [
      {
        id: '98000000-0000-4000-8000-000000000021',
        assignmentId: vipAssignmentId,
        ticketId: '94000000-0000-4000-8000-000000000004',
        ticketRef: 'CHI-DEP-VIP-001',
        rawToken: 'qr-chi-dep-vip-1',
        ticketTypeId: '77777777-7777-4777-8777-777777777771',
        status: 'issued',
        eventId: ids.concertChiDep,
        concertId: ids.concertChiDep,
        gateCode: 'GATE_MAIN',
        zoneCode: 'VIP',
      },
      {
        id: '98000000-0000-4000-8000-000000000022',
        assignmentId: vipAssignmentId,
        ticketId: '94000000-0000-4000-8000-000000000005',
        ticketRef: 'CHI-DEP-VIP-002',
        rawToken: 'qr-chi-dep-vip-2',
        ticketTypeId: '77777777-7777-4777-8777-777777777771',
        status: 'issued',
        eventId: ids.concertChiDep,
        concertId: ids.concertChiDep,
        gateCode: 'GATE_MAIN',
        zoneCode: 'VIP',
      },
    ],
  });

  await prisma.scannerRevokedTicket.create({
    data: {
      id: '98000000-0000-4000-8000-000000000031',
      assignmentId: vipAssignmentId,
      ticketRef: 'CHI-DEP-REVOKED-001',
      reason: 'manual_revoke_demo',
      eventId: ids.concertChiDep,
      concertId: ids.concertChiDep,
      gateCode: 'GATE_MAIN',
      zoneCode: 'VIP',
    },
  });

  await prisma.scannerGuestEntry.create({
    data: {
      id: '98000000-0000-4000-8000-000000000041',
      assignmentId: vipAssignmentId,
      guestRef: 'guest:seed-vip-001',
      displayName: 'Pham Gia Linh',
      eventId: ids.concertChiDep,
      concertId: ids.concertChiDep,
      gateCode: 'GATE_MAIN',
      zoneCode: 'VIP',
    },
  });
}

async function main() {
  await resetDemoData();
  await seedOrganization();
  await seedUsers();
  seedPosterFixtures();
  await seedConcerts();
  await seedTicketTypes();
  await seedCommerce();
  await syncInventoryAndQuotas();
  await seedGuestListDemo();
  await seedArtistBioDemo();
  await seedNotificationDemo();
  await seedScannerDemo();

  console.log('Seed complete.');
  console.log('');
  console.log('Demo accounts:');
  console.log('Organizer: organizer@ticketbox.local / Password123!');
  console.log('Audience 1: audience.one@ticketbox.local / Password123!');
  console.log('Audience 2: audience.two@ticketbox.local / Password123!');
  console.log('Audience 3: audience.three@ticketbox.local / Password123!');
  console.log('');
  console.log('Scanner credentials:');
  console.log(`VIP scanner device: DEV-DEMO-VIP-001`);
  console.log(`VIP scanner token: scanner:${ids.scannerVip}`);
  console.log(`Guest scanner device: DEV-DEMO-GUEST-001`);
  console.log(`Guest scanner token: scanner:${ids.scannerGuest}`);
  console.log('');
  console.log('Seeded concerts:');
  for (const concert of demoConcerts) {
    console.log(`- ${concert.title} (${concert.status}) -> ${concert.slug}`);
  }
  console.log('');
  console.log('Operational demo highlights:');
  console.log(
    '- Refund queue concert: TicketBox Cancellation Drill with order 90000000-0000-4000-8000-000000000005',
  );
  console.log(
    '- Pending payment concert: Anh Trai Say Hi with order 90000000-0000-4000-8000-000000000002',
  );
  console.log(
    '- Scanner demo concert: Chị Đẹp Đạp Gió Rẽ Sóng using DEV-DEMO-VIP-001',
  );
  console.log(
    '- Guest list + AI bio review concert: Chị Đẹp Đạp Gió Rẽ Sóng',
  );
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
