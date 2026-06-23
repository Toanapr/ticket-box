import { randomUUID } from 'crypto';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContext } from './common/context/request-context';
import { DomainHttpExceptionFilter } from './common/filters/domain-http-exception.filter';
import { formatStructuredLog } from './common/logging/structured-log.util';

export function setupApp(app: INestApplication): INestApplication {
  const logger = new Logger('HttpAccess');

  app.use((req: Request, res: Response, next: () => void) => {
    const headerValue = req.headers['x-correlation-id'];
    const correlationId =
      typeof headerValue === 'string' && headerValue.trim().length > 0
        ? headerValue
        : randomUUID();
    const startedAt = Date.now();

    res.setHeader('x-correlation-id', correlationId);

    res.on('finish', () => {
      logger.log(
        formatStructuredLog('request_completed', {
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    });

    RequestContext.run(
      {
        correlationId,
        method: req.method,
        path: req.originalUrl ?? req.url,
        userId: null,
      },
      () => {
        logger.log(formatStructuredLog('request_started'));
        next();
      },
    );
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new DomainHttpExceptionFilter());
  return app;
}
