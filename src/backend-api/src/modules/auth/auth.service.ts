import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAudienceDto } from './dto/register-audience.dto';
import { JwtService } from './jwt.service';
import { hashPassword, verifyPassword } from './password';

const DUMMY_PASSWORD_HASH = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;

type AuthenticatedUser = Pick<User, 'id' | 'email' | 'role' | 'organizationId'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerAudience(dto: RegisterAudienceDto) {
    const email = this.normalizeEmail(dto.email);
    const passwordHash = await hashPassword(dto.password);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'audience',
          status: 'active',
          organizationId: null,
        },
      });
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });
    const passwordMatches = await verifyPassword(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || user.status !== 'active' || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthResponse(user);
  }

  private createAuthResponse(user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      accessToken: this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      }),
      tokenType: 'Bearer',
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isDuplicateEmailError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
