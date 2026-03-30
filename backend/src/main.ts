import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Global prefix
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('OmniAffiliate AI Engine API')
      .setDescription('Affiliate automation platform API')
      .setVersion('1.0')
      .addTag('products', 'Product management')
      .addTag('content', 'Content factory')
      .addTag('publishing', 'Distribution hub')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log(`Swagger: http://localhost:${process.env.BACKEND_PORT ?? 3001}/docs`);
  }

  const port = process.env.BACKEND_PORT ?? 3001;
  await app.listen(port);
  logger.log(`Backend running: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
