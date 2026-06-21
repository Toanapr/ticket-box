import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Audience registration contract (e2e)', () => {
  let app: INestApplication<App>;
  const registerAudience = jest.fn();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerAudience,
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers an audience user', async () => {
    registerAudience.mockResolvedValue({
      user: {
        id: 'user-id',
        email: 'audience@example.com',
        role: 'audience',
      },
      accessToken: 'signed-token',
      tokenType: 'Bearer',
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'audience@example.com',
        password: 'Audience123!',
      })
      .expect(201)
      .expect({
        user: {
          id: 'user-id',
          email: 'audience@example.com',
          role: 'audience',
        },
        accessToken: 'signed-token',
        tokenType: 'Bearer',
      });
  });

  it('rejects an invalid registration payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'invalid-email',
        password: 'short',
      })
      .expect(400);

    expect(registerAudience).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app.close();
  });
});
