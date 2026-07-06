import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScannerAuthGuard } from './scanner-auth.guard';
import { ScannerCorrelationMiddleware } from './scanner-correlation.middleware';
import { ScannerController } from './scanner.controller';
import { ScannerLoggerService } from './scanner-logger.service';
import { ScannerMetricsService } from './scanner-metrics.service';
import { ScannerRepository } from './scanner.repository';
import { ScannerService } from './scanner.service';

@Module({
  controllers: [ScannerController],
  providers: [
    ScannerService,
    ScannerRepository,
    ScannerAuthGuard,
    ScannerLoggerService,
    ScannerMetricsService,
  ],
  exports: [ScannerService, ScannerMetricsService],
})
export class ScannerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ScannerCorrelationMiddleware).forRoutes(ScannerController);
  }
}
