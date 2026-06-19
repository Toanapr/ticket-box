import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Phase 1 API contract (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.DATABASE_URL ??=
      'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox?schema=public';
    process.env.JWT_SECRET ??= 'test-secret';
    process.env.SKIP_PRISMA_CONNECT = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('rejects admin writes without a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/admin/concerts')
      .send({})
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
