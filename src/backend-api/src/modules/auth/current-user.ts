import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from './jwt.service';

export type CurrentUser = AuthTokenPayload;

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUser }>();
    return request.user;
  },
);
