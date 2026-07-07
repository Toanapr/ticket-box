import type { ArtistProfile } from './artist-bio-ai.provider';

export function normalizeArtistProfiles(value: unknown): ArtistProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const profiles: ArtistProfile[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const name = toCleanString(record.name);
    const summary = toCleanString(record.summary);
    const role = toCleanString(record.role);

    if (!name || !summary) {
      continue;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    profiles.push({
      name,
      role: role || undefined,
      summary,
    });
  }

  return profiles.slice(0, 8);
}

function toCleanString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}
