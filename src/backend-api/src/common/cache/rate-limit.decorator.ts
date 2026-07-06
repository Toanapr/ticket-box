import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_RULES, RateLimitRule } from './rate-limit.constants';

export function RateLimit(rules: RateLimitRule[]) {
  return SetMetadata(RATE_LIMIT_RULES, rules);
}
