import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from './jwt.service';
import { RequestContext } from '../../common/context/request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required');
    }

    const user = this.jwtService.verify(authorization.slice('Bearer '.length));
    request.user = user;
    RequestContext.setUserId(user.sub);
    return true;
  }
}
