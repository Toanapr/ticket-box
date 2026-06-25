import {
  isSafePosterObjectKey,
  validatePosterMime,
  validatePosterSignature,
} from './concert-poster-validation.util';

function makeJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
}

function makePng(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}

function makeWebp(): Buffer {
  return Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20,
  ]);
}

function makeSvg(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
}

describe('validatePosterMime', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (mime) => {
    expect(() => validatePosterMime(mime)).not.toThrow();
  });

  it('rejects image/svg+xml', () => {
    expect(() => validatePosterMime('image/svg+xml')).toThrow(
      'Unsupported MIME type',
    );
  });

  it('rejects application/octet-stream', () => {
    expect(() => validatePosterMime('application/octet-stream')).toThrow(
      'Unsupported MIME type',
    );
  });

  it('rejects empty string', () => {
    expect(() => validatePosterMime('')).toThrow('Unsupported MIME type');
  });
});

describe('validatePosterSignature', () => {
  it('detects JPEG', () => {
    expect(validatePosterSignature(makeJpeg())).toBe('jpg');
  });

  it('detects PNG', () => {
    expect(validatePosterSignature(makePng())).toBe('png');
  });

  it('detects WebP', () => {
    expect(validatePosterSignature(makeWebp())).toBe('webp');
  });

  it('rejects SVG', () => {
    expect(() => validatePosterSignature(makeSvg())).toThrow(
      'Invalid image signature',
    );
  });

  it('rejects empty buffer', () => {
    expect(() => validatePosterSignature(Buffer.alloc(0))).toThrow(
      'File is too small',
    );
  });

  it('rejects random bytes', () => {
    expect(() =>
      validatePosterSignature(
        Buffer.from([
          0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
          0x0b, 0x0c,
        ]),
      ),
    ).toThrow('Invalid image signature');
  });
});

describe('isSafePosterObjectKey', () => {
  it.each([
    '11111111-1111-4111-8111-111111111111-1.png',
    '11111111-1111-4111-8111-111111111111-2-22222222-2222-4222-8222-222222222222.webp',
  ])('accepts generated key %s', (objectKey) => {
    expect(isSafePosterObjectKey(objectKey)).toBe(true);
  });

  it.each(['../poster.png', '/tmp/poster.png', 'concert-1.png'])(
    'rejects unsafe key %s',
    (objectKey) => {
      expect(isSafePosterObjectKey(objectKey)).toBe(false);
    },
  );
});
