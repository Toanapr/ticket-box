import {
  ARTIST_BIO_MAX_INPUT_CHARS,
  ArtistBioTextService,
} from './artist-bio-text.service';
import pdfParse from 'pdf-parse';

jest.mock('pdf-parse', () => jest.fn());

const mockedPdfParse = jest.mocked(pdfParse);

describe('ArtistBioTextService', () => {
  const service = new ArtistBioTextService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extracts and sanitizes Vietnamese text through a real PDF parser boundary', async () => {
    mockedPdfParse.mockResolvedValue({
      text: 'Nghệ sĩ demo có phong cách trẻ trung\nvà đã có nhiều đêm diễn lớn.',
    } as Awaited<ReturnType<typeof pdfParse>>);

    await expect(
      service.extractTextFromPdf(Buffer.from('%PDF-1.7\n%%EOF')),
    ).resolves.toBe(
      'Nghệ sĩ demo có phong cách trẻ trung và đã có nhiều đêm diễn lớn.',
    );

    expect(mockedPdfParse).toHaveBeenCalledWith(Buffer.from('%PDF-1.7\n%%EOF'));
  });

  it('rejects a PDF without extractable text', async () => {
    mockedPdfParse.mockResolvedValue({
      text: '',
    } as Awaited<ReturnType<typeof pdfParse>>);

    await expect(
      service.extractTextFromPdf(Buffer.from('%PDF-1.4\n%%EOF')),
    ).rejects.toThrow('extractable text');
  });

  it('limits extracted text before it is sent to AI', async () => {
    const largeText = 'a'.repeat(ARTIST_BIO_MAX_INPUT_CHARS + 100);
    mockedPdfParse.mockResolvedValue({
      text: largeText,
    } as Awaited<ReturnType<typeof pdfParse>>);

    await expect(
      service.extractTextFromPdf(Buffer.from('%PDF-1.4\n%%EOF')),
    ).resolves.toHaveLength(ARTIST_BIO_MAX_INPUT_CHARS);
  });

  it('wraps parser failures as unreadable PDF errors', async () => {
    mockedPdfParse.mockRejectedValue(new Error('bad xref'));

    await expect(
      service.extractTextFromPdf(Buffer.from('%PDF-1.4\n%%EOF')),
    ).rejects.toThrow('PDF is unreadable or invalid');
  });
});
