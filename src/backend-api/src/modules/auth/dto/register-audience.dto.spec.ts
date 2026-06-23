import { validate } from 'class-validator';
import { RegisterAudienceDto } from './register-audience.dto';

describe('RegisterAudienceDto', () => {
  it('accepts a valid email and password', async () => {
    const dto = Object.assign(new RegisterAudienceDto(), {
      email: 'audience@example.com',
      password: 'Audience123!',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects an invalid email and a short password', async () => {
    const dto = Object.assign(new RegisterAudienceDto(), {
      email: 'invalid-email',
      password: 'short',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});
