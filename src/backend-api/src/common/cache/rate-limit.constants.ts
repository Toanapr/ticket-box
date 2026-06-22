export type RateLimitScope = 'ip' | 'user' | 'device';

export type RateLimitRule = {
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
};

export const RATE_LIMIT_RULES = Symbol('RATE_LIMIT_RULES');
