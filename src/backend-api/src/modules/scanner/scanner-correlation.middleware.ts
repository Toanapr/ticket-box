import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { randomUUID } from 'crypto';
import { ScannerRequest } from './scanner-request-context';

@Injectable()
export class ScannerCorrelationMiddleware implements NestMiddleware {
  use(request: ScannerRequest, response: Response, next: NextFunction) {
    const headerValue = request.headers['x-correlation-id'];
    const correlationId = this.normalizeCorrelationId(headerValue);

    request.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);
    next();
  }

  private normalizeCorrelationId(headerValue: string | string[] | undefined): string {
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue.trim();
    }

    return randomUUID();
  }
}
