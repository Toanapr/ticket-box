import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { hashPassword } from './password';

interface CreateUserArgs {
  data: {
    email: string;
    passwordHash: string;
    role: 'audience';
    status: 'active';
    organizationId: null;
  };
}

describe('AuthService', () => {
  const userCreate = jest.fn();
  const userFindUnique = jest.fn();
  const sign = jest.fn().mockReturnValue('signed-token');
  const prisma = {
    user: {
      create: userCreate,
      findUnique: userFindUnique,
    },
  } as unknown as PrismaService;
  const jwtService = { sign } as unknown as JwtService;
  const service = new AuthService(prisma, jwtService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers an active audience user and returns a token', async () => {
    userCreate.mockResolvedValue({
      id: 'user-id',
      email: 'audience@example.com',
      role: 'audience',
      status: 'active',
      organizationId: null,
      passwordHash: 'stored-password-hash',
    });

    const result = await service.registerAudience({
      email: ' Audience@Example.com ',
      password: 'Audience123!',
    });

    expect(userCreate).toHaveBeenCalledTimes(1);
    const createCalls = userCreate.mock.calls as unknown as Array<
      [CreateUserArgs]
    >;
    const createdData = createCalls[0][0].data;
    expect(createdData).toMatchObject({
      email: 'audience@example.com',
      role: 'audience',
      status: 'active',
      organizationId: null,
    });
    expect(createdData.passwordHash).toMatch(/^scrypt:/);
    expect(result).toEqual({
      user: {
        id: 'user-id',
        email: 'audience@example.com',
        role: 'audience',
      },
      accessToken: 'signed-token',
      tokenType: 'Bearer',
    });
  });

  it('returns conflict when the email already exists', async () => {
    userCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.registerAudience({
        email: 'audience@example.com',
        password: 'Audience123!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in an active audience user', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-id',
      email: 'audience@example.com',
      passwordHash: await hashPassword('Audience123!'),
      role: 'audience',
      status: 'active',
      organizationId: null,
    });

    const result = await service.login({
      email: 'Audience@Example.com',
      password: 'Audience123!',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.role).toBe('audience');
  });

  it('rejects invalid credentials', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'Audience123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
