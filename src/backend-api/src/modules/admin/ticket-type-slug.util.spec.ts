import {
  slugifyTicketTypeName,
  ticketTypeSlugCandidate,
} from './ticket-type-slug.util';

describe('ticket type slug utilities', () => {
  it.each([
    ['General Admission', 'general-admission'],
    ['Vé Đứng Khu A', 've-dung-khu-a'],
    ['***', 'ticket'],
  ])('normalizes %s', (name, expected) => {
    expect(slugifyTicketTypeName(name)).toBe(expected);
  });

  it('adds a numeric suffix after the first attempt', () => {
    expect(ticketTypeSlugCandidate('vip', 1)).toBe('vip');
    expect(ticketTypeSlugCandidate('vip', 2)).toBe('vip-2');
  });
});
