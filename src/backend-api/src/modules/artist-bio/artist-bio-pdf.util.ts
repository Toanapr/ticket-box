function decodePdfText(value: string): string {
  return value
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

export function extractPdfText(buffer: Buffer): string {
  const source = buffer.toString('latin1');
  const chunks: string[] = [];
  const textMatches = source.matchAll(/\(([^()]*)\)\s*Tj/g);

  for (const match of textMatches) {
    const value = decodePdfText(match[1] ?? '').trim();
    if (value.length > 0) {
      chunks.push(value);
    }
  }

  const arrayMatches = source.matchAll(/\[(.*?)\]\s*TJ/gs);
  for (const match of arrayMatches) {
    const block = match[1] ?? '';
    for (const inner of block.matchAll(/\(([^()]*)\)/g)) {
      const value = decodePdfText(inner[1] ?? '').trim();
      if (value.length > 0) {
        chunks.push(value);
      }
    }
  }

  if (chunks.length === 0) {
    const printable = source.match(/[A-Za-z0-9][A-Za-z0-9 ,.'"!?:;()/&-]{20,}/g) ?? [];
    chunks.push(...printable.map((entry) => entry.trim()));
  }

  return chunks.join(' ').trim();
}

export function sanitizeArtistBioSourceText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
