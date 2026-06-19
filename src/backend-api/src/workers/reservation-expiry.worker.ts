import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { formatStructuredLog } from '../common/logging/structured-log.util';
import { InventoryService } from '../modules/inventory/inventory.service';

@Injectable()
export class ReservationExpiryWorker {
  private readonly logger = new Logger(ReservationExpiryWorker.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Interval(60_000)
  async run(): Promise<void> {
    if (!this.isWorkerEnabled()) {
      return;
    }

    const result = await this.inventoryService.expireReservationsBatch();

    if (result.scannedCount === 0) {
      return;
    }

    this.logger.log(
      formatStructuredLog('reservation_expiry_batch_completed', {
        scannedCount: result.scannedCount,
        expiredCount: result.expiredCount,
        expiredOrderCount: result.expiredOrderCount,
      }),
    );
  }

  private isWorkerEnabled(): boolean {
    const configuredValue = this.configService.get<string>(
      'RESERVATION_EXPIRY_WORKER_ENABLED',
    );

    if (!configuredValue) {
      return true;
    }

    return configuredValue.toLowerCase() !== 'false';
  }
}
