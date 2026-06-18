import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DomainError } from '../errors/domain-error';

@Catch()
export class DomainHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof DomainError) {
      response.status(exception.statusCode).json({
        error: exception.code,
        message: exception.message,
        details: exception.details ?? null,
      });
      return;
    }

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : undefined);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: 'internal_error',
      message: 'Unexpected error',
    });
  }
}
