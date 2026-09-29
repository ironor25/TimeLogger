import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(prefix);

  // Global HTTP Request Logger
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const { method, originalUrl } = req;
    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      const icon = statusCode >= 400 ? '❌' : statusCode >= 300 ? '🔀' : '🌐';
      logger.log(`${icon} [HTTP] ${method} ${originalUrl} -> ${statusCode} (${duration}ms)`);
    });
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // OpenAPI Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PulseTime API')
    .setDescription(
      'Workforce Time-Tracking, Activity Ingestion & Employee Productivity SaaS Platform API.\n\n' +
      'Contains both Admin/Web management endpoints and Desktop Agent telemetry endpoints (/api/v1/agent/...).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .addTag('auth', 'Authentication and token lifecycle')
    .addTag('agent', 'Desktop Agent API: auth, heartbeats, screenshots, and work sessions')
    .addTag('employees', 'Employee profile management and team hierarchy')
    .addTag('work-sessions', 'Authoritative session management and break controls')
    .addTag('attendance', 'Daily overview and calculated attendance records')
    .addTag('screenshots', 'Screenshot capture gallery and secure storage metadata')
    .addTag('reports', 'Productivity summaries, timelines, and CSV exports')
    .addTag('projects', 'Project tracking and team member allocations')
    .addTag('tasks', 'Task status and time tracking associations')
    .addTag('leaves', 'Leave balances, requests, and manager approvals')
    .addTag('time-entries', 'Manual time submissions and approval workflows')
    .addTag('roles', 'RBAC roles and granular permission sets')
    .addTag('organizations', 'Organization settings and day-reset configuration')
    .addTag('devices', 'Desktop device management and status')
    .addTag('health', 'System health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 PulseTime API running on: http://0.0.0.0:${port}/${prefix}`);
  logger.log(`📚 Swagger documentation available on: http://0.0.0.0:${port}/api/docs`);
}

bootstrap();
