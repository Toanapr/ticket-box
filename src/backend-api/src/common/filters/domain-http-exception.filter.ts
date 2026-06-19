import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RequestContext } from '../context/request-context';
import { DomainError } from '../errors/domain-error';
import { formatStructuredLog } from '../logging/structured-log.util';

@Catch()
export class DomainHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const correlationId = RequestContext.getCorrelationId() ?? null;

    if (exception instanceof DomainError) {
      this.logger.warn(
        formatStructuredLog('domain_error', {
          errorCode: exception.code,
          statusCode: exception.statusCode,
        }),
      );
      response.status(exception.statusCode).json({
        error: exception.code,
        message: exception.message,
        details: exception.details ?? null,
        correlationId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      this.logger.warn(
        formatStructuredLog('http_exception', {
          statusCode: exception.getStatus(),
        }),
      );
      response.status(exception.getStatus()).json({
        ...(typeof exception.getResponse() === 'object'
          ? (exception.getResponse() as Record<string, unknown>)
          : { message: exception.getResponse() }),
        correlationId,
      });
      return;
    }

    this.logger.error(
      formatStructuredLog('unhandled_exception'),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'internal_error',
      message: 'Unexpected error',
      correlationId,
    });
  }
}
