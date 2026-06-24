import { concertSlugCandidate, slugifyConcertTitle } from './concert-slug.util';

describe('concert slug utilities', () => {
  it.each([
    ['TicketBox Summer Live', 'ticketbox-summer-live'],
    ['Đêm Nhạc Mùa Hè 2026', 'dem-nhac-mua-he-2026'],
    ['  VIP & GA: Live!  ', 'vip-ga-live'],
    ['***', 'concert'],
  ])('normalizes %s', (title, expected) => {
    expect(slugifyConcertTitle(title)).toBe(expected);
  });

  it('adds a stable numeric suffix only after the first attempt', () => {
    expect(concertSlugCandidate('summer-live', 1)).toBe('summer-live');
    expect(concertSlugCandidate('summer-live', 2)).toBe('summer-live-2');
  });
});
