import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets(join(import.meta.dirname, '..', 'public'));
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
