import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_PATTERN = /^[0-9a-f]{32}$/i;
const HASH_PATTERN = /^[0-9a-f]{128}$/i;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await deriveKey(password, salt)).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, salt, expectedHash] = encoded.split(':');

  if (
    algorithm !== 'scrypt' ||
    !SALT_PATTERN.test(salt ?? '') ||
    !HASH_PATTERN.test(expectedHash ?? '')
  ) {
    return false;
  }

  const actual = await deriveKey(password, salt);
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
