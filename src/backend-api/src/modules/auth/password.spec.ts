import { hashPassword, verifyPassword } from './password';

describe('password utilities', () => {
  it('hashes and verifies a password', async () => {
    const encoded = await hashPassword('Audience123!');

    expect(encoded).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    await expect(verifyPassword('Audience123!', encoded)).resolves.toBe(true);
    await expect(verifyPassword('WrongPassword123!', encoded)).resolves.toBe(
      false,
    );
  });

  it('rejects malformed password hashes', async () => {
    await expect(verifyPassword('Audience123!', 'invalid')).resolves.toBe(
      false,
    );
  });
});
