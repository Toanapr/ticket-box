import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  isSafeArtistBioObjectKey,
  validateArtistBioPdf,
} from './artist-bio-validation.util';

@Injectable()
export class ArtistBioStorageService implements OnModuleInit {
  private readonly logger = new Logger(ArtistBioStorageService.name);
  private readonly bucket: string;
  private readonly s3: S3Client;

  constructor() {
    this.bucket = process.env.ARTIST_BIO_S3_BUCKET ?? 'artist-bio-pdfs';
    this.s3 = new S3Client({
      endpoint: process.env.ARTIST_BIO_S3_ENDPOINT ?? 'http://localhost:9000',
      region: process.env.ARTIST_BIO_S3_REGION ?? 'us-east-1',
      forcePathStyle: parseBoolean(
        process.env.ARTIST_BIO_S3_FORCE_PATH_STYLE,
        true,
      ),
      credentials: {
        accessKeyId: process.env.ARTIST_BIO_S3_ACCESS_KEY_ID ?? 'ticketbox',
        secretAccessKey:
          process.env.ARTIST_BIO_S3_SECRET_ACCESS_KEY ?? 'ticketbox123',
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
    this.logger.log(`Artist bio MinIO bucket ready: ${this.bucket}`);
  }

  async save(
    concertId: string,
    pipelineVersion: string,
    file: Express.Multer.File,
  ): Promise<{ objectKey: string; checksum: string }> {
    validateArtistBioPdf(file);

    const checksum = this.sha256(file.buffer);
    const objectKey = this.buildObjectKey(concertId, checksum, pipelineVersion);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: file.buffer,
          ContentType: 'application/pdf',
          Metadata: {
            concert_id: concertId,
            checksum,
            pipeline_version: pipelineVersion,
          },
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to write artist bio PDF to MinIO: ${errorMessage(error)}`,
      );
    }

    return { objectKey, checksum };
  }

  async read(objectKey: string): Promise<Buffer> {
    this.assertSafeObjectKey(objectKey);

    const result = await this.s3.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    if (!result.Body) {
      throw new BadRequestException('Artist bio PDF object is empty');
    }

    return streamToBuffer(result.Body);
  }

  async delete(objectKey: string): Promise<void> {
    this.assertSafeObjectKey(objectKey);
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );
  }

  buildObjectKey(
    concertId: string,
    checksum: string,
    pipelineVersion: string,
    token = randomUUID(),
  ): string {
    const numericVersion = pipelineVersion.replace(/\D/g, '') || '1';
    return `${concertId}/${checksum}/v${numericVersion}-${token}.pdf`;
  }

  getBucket(): string {
    return this.bucket;
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  private assertSafeObjectKey(objectKey: string): void {
    if (!isSafeArtistBioObjectKey(objectKey)) {
      throw new BadRequestException('Invalid artist bio object key');
    }
  }

  private sha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks);
  }

  if (isByteArrayTransformable(body)) {
    return Buffer.from(await body.transformToByteArray());
  }

  throw new InternalServerErrorException('Unsupported MinIO response body');
}

interface ByteArrayTransformable {
  transformToByteArray(): Promise<Uint8Array>;
}

function isByteArrayTransformable(
  body: unknown,
): body is ByteArrayTransformable {
  return (
    body !== null &&
    typeof body === 'object' &&
    'transformToByteArray' in body &&
    typeof body.transformToByteArray === 'function'
  );
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
