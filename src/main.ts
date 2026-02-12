import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'body-parser';
import helmet from 'helmet';
import { AppLoggerService } from './logger/services/app-logger/app-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CustomExceptionFilter } from './common/filters/custom-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NotFoundExceptionFilter } from './common/filters/not-found-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
// import { AppEnv } from './services/app-config/configTypes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  // const logger = app.get(AppLoggerService);
  // const appEnv = configService.get<AppEnv>('appEnv') || AppEnv.DEV;

  // app.useLogger(logger);
  app.use(json({ limit: '1mb' }));
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // ✅ CORP fix
    }),
  );

  app.enableCors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.enableShutdownHooks();

  // Apply global filters
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new ValidationExceptionFilter(),
    new NotFoundExceptionFilter(),
    new CustomExceptionFilter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Seperator Api List')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'SWAGGER Documentation',
  });
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);
  const port = configService.get<number>('port') || 3000;
  const host = '0.0.0.0';

  await app.listen(port ?? 3000, host);
  logger.log(`🚀 App started on http://localhost:${port}/api`);
}

bootstrap();
