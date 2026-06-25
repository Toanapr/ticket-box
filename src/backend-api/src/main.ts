import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();
  setupApp(app);

  const posterDir = resolve(
    process.env.CONCERT_POSTER_STORAGE_DIR ?? 'storage/concert-posters',
  );
  app.useStaticAssets(posterDir, {
    prefix: '/media/concert-posters/',
    setHeaders: (res: Response) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
