import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ScannerLoggerService {
  private readonly logger = new Logger('ScannerApi');

  log(event: string, payload: Record<string, unknown>) {
    this.logger.log(this.serialize(event, payload));
  }

  warn(event: string, payload: Record<string, unknown>) {
    this.logger.warn(this.serialize(event, payload));
  }

  private serialize(event: string, payload: Record<string, unknown>): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...payload,
    });
  }
}
