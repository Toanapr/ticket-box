import { createHmac } from 'crypto';

export function signScannerManifest(secret: string, payload: unknown): string {
  return createHmac('sha256', secret).update(toCanonicalJson(payload)).digest('hex');
}

function toCanonicalJson(value: unknown): string {
  return JSON.stringify(sortRecursively(value));
}

function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortRecursively(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortRecursively((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
}
