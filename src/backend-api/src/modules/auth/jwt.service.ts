import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { APP_CONFIG } from '../../config/app-config';
import type { AppConfig } from '../../config/app-config';

interface JwtHeader {
  alg: string;
  typ: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string | null;
  iss: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  return Buffer.from(padded, 'base64');
}

@Injectable()
export class JwtService {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  sign(payload: Omit<AuthTokenPayload, 'iss' | 'iat' | 'exp'>): string {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + this.config.jwtExpiresInSeconds;
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(
      JSON.stringify({
        ...payload,
        iss: this.config.jwtIssuer,
        iat,
        exp,
      }),
    );
    const signature = this.signContent(`${encodedHeader}.${encodedPayload}`);

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verify(token: string): AuthTokenPayload {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid token');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = this.signContent(
      `${encodedHeader}.${encodedPayload}`,
    );

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      throw new UnauthorizedException('Invalid token signature');
    }

    let header: JwtHeader;
    let decoded: AuthTokenPayload;
    try {
      header = JSON.parse(
        base64UrlDecode(encodedHeader).toString('utf8'),
      ) as JwtHeader;
      decoded = JSON.parse(
        base64UrlDecode(encodedPayload).toString('utf8'),
      ) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedException('Invalid token header');
    }

    if (decoded.iss !== this.config.jwtIssuer) {
      throw new UnauthorizedException('Invalid token issuer');
    }

    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.email !== 'string' ||
      typeof decoded.role !== 'string'
    ) {
      throw new UnauthorizedException('Invalid token claims');
    }

    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired');
    }

    return decoded;
  }

  private signContent(content: string): string {
    return createHmac('sha256', this.config.jwtSecret)
      .update(content)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
}
