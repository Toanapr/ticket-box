import { validate } from 'class-validator';
import { RegisterOrganizerDto } from './register-organizer.dto';

describe('RegisterOrganizerDto', () => {
  it('accepts a valid organizer registration payload', async () => {
    const dto = Object.assign(new RegisterOrganizerDto(), {
      fullName: 'Organizer User',
      email: 'organizer@example.com',
      organizationName: 'TicketBox Events',
      password: 'Organizer123!',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid organizer registration payloads', async () => {
    const dto = Object.assign(new RegisterOrganizerDto(), {
      fullName: 'A',
      email: 'invalid-email',
      organizationName: 'X',
      password: 'short',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'fullName',
        'email',
        'organizationName',
        'password',
      ]),
    );
  });
});
