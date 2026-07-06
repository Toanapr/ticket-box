import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ScannerRequest } from './scanner-request-context';

export type ScannerPrincipal = {
  userId: string;
  role: 'scanner';
};

@Injectable()
export class ScannerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ScannerRequest>();
    const authorizationHeader = request.headers.authorization;
    const token = this.extractBearerToken(authorizationHeader);
    const principal = this.parseScannerToken(token);

    request.scannerPrincipal = principal;
    return true;
  }

  private extractBearerToken(authorizationHeader: string | string[] | undefined): string {
    if (!authorizationHeader || Array.isArray(authorizationHeader)) {
      throw new UnauthorizedException({
        error: 'scanner_unauthorized',
        message: 'Scanner bearer token is required',
      });
    }

    if (!authorizationHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'scanner_unauthorized',
        message: 'Authorization header must use Bearer token format',
      });
    }

    return authorizationHeader.slice('Bearer '.length).trim();
  }

  private parseScannerToken(token: string): ScannerPrincipal {
    const [role, userId] = token.split(':', 2);

    if (role !== 'scanner' || !userId) {
      throw new UnauthorizedException({
        error: 'scanner_role_invalid',
        message: 'Bearer token must identify a scanner role',
      });
    }

    return {
      role: 'scanner',
      userId,
    };
  }
}
