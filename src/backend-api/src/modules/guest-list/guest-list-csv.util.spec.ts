import { BadRequestException } from '@nestjs/common';
import { parseGuestListCsv } from './guest-list-csv.util';

describe('parseGuestListCsv', () => {
  it('parses semicolon-delimited CSV with quoted fields', () => {
    const parsed = parseGuestListCsv(
      Buffer.from('full_name;email;zone_code\n"Nguyen, An";an@example.com;VIP\n'),
    );

    expect(parsed.delimiter).toBe(';');
    expect(parsed.rows[0]).toEqual({
      rowNumber: 2,
      values: {
        full_name: 'Nguyen, An',
        email: 'an@example.com',
        zone_code: 'VIP',
      },
    });
  });

  it('rejects missing identity headers', () => {
    expect(() =>
      parseGuestListCsv(Buffer.from('full_name,zone_code\nJane,VIP\n')),
    ).toThrow(BadRequestException);
  });
});
