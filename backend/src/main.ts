import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is required in production (set it in Render → Environment)');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontend,
      'http://127.0.0.1:3000',
      'https://saas-jade-tau.vercel.app',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`BusinessOS API running on port ${port}`);
  console.log(`Health: /api/health`);
}

bootstrap();
