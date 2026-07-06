import { ExecutionContext, HttpException } from '@nestjs/common';
import { ReservationRiskGuard } from './reservation-risk.guard';

type TestContext = {
  context: ExecutionContext;
  response: {
    setHeader: jest.Mock;
  };
};

function createContext(options: {
  headers?: Record<string, string>;
  user?: { sub: string };
  body?: Record<string, unknown>;
}): TestContext {
  const request = {
    headers: options.headers ?? {},
    ip: '127.0.0.1',
    user: options.user,
    body: options.body ?? { quantity: 1 },
  };
  const response = {
    setHeader: jest.fn(),
  };

  return {
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext,
    response,
  };
}

describe('ReservationRiskGuard', () => {
  it('allows normal reservation requests with device/session context', () => {
    const guard = new ReservationRiskGuard();

    expect(
      guard.canActivate(
        createContext({
          headers: {
            'x-device-id': 'device-1',
            'accept-language': 'vi-VN',
          },
          user: { sub: 'user-1' },
          body: { quantity: 2 },
        }).context,
      ),
    ).toBe(true);
  });

  it('does not block solely because optional device/session headers are missing', () => {
    const guard = new ReservationRiskGuard();

    expect(
      guard.canActivate(
        createContext({
          headers: { 'accept-language': 'vi-VN' },
          user: { sub: 'user-1' },
          body: { quantity: 2 },
        }).context,
      ),
    ).toBe(true);
  });

  it('rejects high-risk rapid reservation attempts with Retry-After', () => {
    const guard = new ReservationRiskGuard();
    const contexts = Array.from({ length: 6 }, () =>
      createContext({
        user: { sub: 'risk-user' },
        body: { quantity: 1 },
      }),
    );

    for (const context of contexts.slice(0, 5)) {
      expect(guard.canActivate(context.context)).toBe(true);
    }

    expect(() => guard.canActivate(contexts[5].context)).toThrow(HttpException);
    expect(contexts[5].response.setHeader).toHaveBeenCalledWith(
      'Retry-After',
      '30',
    );
  });
});
