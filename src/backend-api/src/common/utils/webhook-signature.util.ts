import { createHmac, timingSafeEqual } from 'crypto';

export function createWebhookSignature(
  secret: string,
  payload: unknown,
): string {
  const content = toCanonicalJson(payload);
  return createHmac('sha256', secret).update(content).digest('hex');
}

export function verifyWebhookSignature(
  secret: string,
  payload: unknown,
  signature: string | undefined,
): boolean {
  if (!signature) {
    return false;
  }

  const expected = createWebhookSignature(secret, payload);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function toCanonicalJson(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortRecursively(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortRecursively((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}
