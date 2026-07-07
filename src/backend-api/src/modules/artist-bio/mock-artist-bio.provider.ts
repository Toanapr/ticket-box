import { Injectable } from '@nestjs/common';
import {
  ArtistBioGenerationInput,
  ArtistBioGenerationResult,
  ArtistBioProvider,
  ArtistBioProviderTimeoutError,
} from './artist-bio-ai.provider';

@Injectable()
export class MockArtistBioProvider implements ArtistBioProvider {
  readonly providerVersion = 'mock-provider-v1';
  readonly modelVersion = 'mock-model-v1';

  async generateBio(
    input: ArtistBioGenerationInput,
  ): Promise<ArtistBioGenerationResult> {
    if (input.sourceText.includes('[[AI_TIMEOUT]]')) {
      throw new ArtistBioProviderTimeoutError();
    }

    if (input.sourceText.includes('Summer Pulse Live 2026')) {
      return {
        draftContent: 'Concert Summer Pulse Live 2026 quy tụ dàn nghệ sĩ hàng đầu bao gồm Luna Mai, Khai Noir, Mira Thao và The Echo District. Đêm nhạc hứa hẹn mang đến những màn trình diễn Pop, R&B, rap và electronic bùng nổ cùng hệ thống âm thanh, ánh sáng được đầu tư hoành tráng.',
        artistProfiles: [
          {
            name: 'Luna Mai',
            role: 'Headliner and pop vocalist',
            summary: 'Luna Mai là một ca sĩ nhạc pop Việt Nam nổi tiếng với khả năng sáng tác đầy cảm xúc và giọng hát live chuẩn xác.',
          },
          {
            name: 'Khai Noir',
            role: 'Featured rapper and live collaborator',
            summary: 'Khai Noir là một rapper nổi tiếng với lối đọc rap giai điệu và khả năng trình diễn sân khấu hoạt bát.',
          },
          {
            name: 'Mira Thao',
            role: 'R&B guest performer',
            summary: 'Mira Thao là ca sĩ R&B sở hữu chất giọng ấm áp và cách xử lý tinh tế.',
          },
          {
            name: 'The Echo District',
            role: 'Live electronic band and production collaborators',
            summary: 'The Echo District là ban nhạc điện tử kết hợp trống live và âm thanh synth đầy không gian.',
          },
        ],
      };
    }

    const normalized = input.sourceText.replace(/\s+/g, ' ').trim();
    const summary = normalized.slice(0, 220);
    const closing = summary.endsWith('.') ? '' : '.';
    return {
      draftContent: `Sự kiện mang đến đêm nhạc của nghệ sĩ ${input.artistName} với phong cách trình diễn nhạc Pop hiện đại. Đêm nhạc hứa hẹn mang lại những khoảnh khắc bùng nổ, kết hợp giữa âm nhạc chất lượng và sự kết nối gần gũi với khán giả.`,
      artistProfiles: [
        {
          name: input.artistName,
          role: 'Featured artist',
          summary: `Nghệ sĩ ${input.artistName} biểu diễn chính trong sự kiện. ${summary}${closing}`,
        },
      ],
    };
  }
}
