import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { formatStructuredLog } from '../../../common/logging/structured-log.util';
import { PaymentReconciliationService } from '../payment-reconciliation.service';

@Injectable()
export class PaymentReconciliationWorker {
  private readonly logger = new Logger(PaymentReconciliationWorker.name);
  private running = false;

  constructor(private readonly reconciliation: PaymentReconciliationService) {}

  @Interval(5000)
  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.reconciliation.runBatch();
      if (result.claimed > 0) {
        this.logger.log(
          formatStructuredLog('payment_reconciliation_batch', result),
        );
      }
    } finally {
      this.running = false;
    }
  }
}
