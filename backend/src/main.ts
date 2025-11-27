import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import { SentryService } from './common/monitoring/sentry.service';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables before anything else
dotenv.config({ path: resolve(__dirname, '../.env') });
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for Stripe webhooks
  });
  app.setGlobalPrefix('api');
  
  // Initialize Sentry (must be done before other middleware)
  const sentryService = app.get(SentryService);
  sentryService.onModuleInit();
  
  // Note: Global filters and interceptors are registered via APP_FILTER and APP_INTERCEPTOR
  // in AppModule, so we don't need to register them here manually
  
  // Enable validation globally (skip for webhook routes)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Use WebSocket adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  await app.listen(3001);
  console.log('Backend is running on http://localhost:3001');
}
bootstrap();

