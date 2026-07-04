import { validateArtistBioPdf } from './artist-bio-validation.util';

function pdfFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    originalname: 'press-kit.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n(Artist biography text)\n%%EOF'),
    ...overrides,
  } as Express.Multer.File;
}

describe('validateArtistBioPdf', () => {
  it('accepts a PDF with extension, MIME and signature', () => {
    expect(() => validateArtistBioPdf(pdfFile())).not.toThrow();
  });

  it('rejects a non-PDF extension', () => {
    expect(() =>
      validateArtistBioPdf(pdfFile({ originalname: 'press-kit.txt' })),
    ).toThrow('.pdf extension');
  });

  it('rejects a non-PDF MIME type', () => {
    expect(() =>
      validateArtistBioPdf(pdfFile({ mimetype: 'text/plain' })),
    ).toThrow('application/pdf');
  });

  it('rejects a missing PDF signature', () => {
    expect(() =>
      validateArtistBioPdf(pdfFile({ buffer: Buffer.from('not a pdf') })),
    ).toThrow('valid PDF');
  });
});
