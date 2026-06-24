const maxBaseLength = 80;

export function slugifyPublicLabel(label: string, fallback: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxBaseLength)
    .replace(/-+$/g, '');

  return slug || fallback;
}

export function slugifyConcertTitle(title: string): string {
  return slugifyPublicLabel(title, 'concert');
}

export function concertSlugCandidate(
  baseSlug: string,
  attempt: number,
): string {
  return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}
