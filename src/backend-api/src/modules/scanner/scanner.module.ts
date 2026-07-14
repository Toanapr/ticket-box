import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GuestListModule } from '../guest-list/guest-list.module';
import { ScannerAuthGuard } from './scanner-auth.guard';
import { ScannerCorrelationMiddleware } from './scanner-correlation.middleware';
import { ScannerController } from './scanner.controller';
import { ScannerLoggerService } from './scanner-logger.service';
import { ScannerManifestProjectionService } from './scanner-manifest-projection.service';
import { ScannerMetricsService } from './scanner-metrics.service';
import { ScannerRepository } from './scanner.repository';
import { ScannerService } from './scanner.service';

@Module({
  imports: [GuestListModule],
  controllers: [ScannerController],
  providers: [
    ScannerService,
    ScannerRepository,
    ScannerAuthGuard,
    ScannerLoggerService,
    ScannerMetricsService,
    ScannerManifestProjectionService,
  ],
  exports: [
    ScannerService,
    ScannerMetricsService,
    ScannerManifestProjectionService,
  ],
})
export class ScannerModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ScannerCorrelationMiddleware).forRoutes(ScannerController);
  }
}
