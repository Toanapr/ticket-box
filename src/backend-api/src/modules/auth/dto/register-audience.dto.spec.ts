import { validate } from 'class-validator';
import { RegisterAudienceDto } from './register-audience.dto';

describe('RegisterAudienceDto', () => {
  it('accepts a valid full name, email and password', async () => {
    const dto = Object.assign(new RegisterAudienceDto(), {
      fullName: 'Audience User',
      email: 'audience@example.com',
      password: 'Audience123!',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a missing full name, invalid email and short password', async () => {
    const dto = Object.assign(new RegisterAudienceDto(), {
      email: 'invalid-email',
      password: 'short',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['fullName', 'email', 'password']),
    );
  });
});
