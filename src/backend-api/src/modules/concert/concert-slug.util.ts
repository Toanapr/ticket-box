const maxBaseLength = 80;

export function slugifyConcertTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxBaseLength)
    .replace(/-+$/g, '');

  return slug || 'concert';
}

export function concertSlugCandidate(
  baseSlug: string,
  attempt: number,
): string {
  return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}
