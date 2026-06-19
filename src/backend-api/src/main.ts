import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  setupApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
