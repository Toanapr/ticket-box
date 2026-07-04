import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ArtistBioService } from './artist-bio.service';
import { ARTIST_BIO_MAX_PDF_BYTES } from './artist-bio-validation.util';

@UseGuards(AuthGuard, RolesGuard)
@Roles('organizer', 'system_admin')
@Controller('admin')
export class ArtistBioController {
  constructor(private readonly artistBioService: ArtistBioService) {}

  @Post('concerts/:id/artist-bio/jobs')
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: memoryStorage(),
      limits: { fileSize: ARTIST_BIO_MAX_PDF_BYTES, files: 1 },
    }),
  )
  createJob(
    @CurrentUser() user: CurrentUser,
    @Param('id') concertId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: ARTIST_BIO_MAX_PDF_BYTES }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.artistBioService.createJob(user, concertId, file);
  }

  @Get('concerts/:id/artist-bio/jobs')
  getLatestJob(
    @CurrentUser() user: CurrentUser,
    @Param('id') concertId: string,
  ) {
    return this.artistBioService.getLatestJob(user, concertId);
  }

  @Post('artist-bio/jobs/:id/retry')
  retryJob(@CurrentUser() user: CurrentUser, @Param('id') jobId: string) {
    return this.artistBioService.retryJob(user, jobId);
  }
}
