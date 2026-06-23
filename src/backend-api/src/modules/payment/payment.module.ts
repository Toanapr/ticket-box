import { Module } from '@nestjs/common';
import { TicketModule } from '../ticket/ticket.module';
import { PaymentController } from './payment.controller';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.port';
import { MockPaymentProvider } from './providers/mock-payment-provider';
import { PaymentBulkheadService } from './resilience/payment-bulkhead.service';
import { PaymentCircuitBreakerService } from './resilience/payment-circuit-breaker.service';
import { ResilientPaymentProvider } from './resilience/resilient-payment-provider';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { PaymentIntentService } from './payment-intent.service';
import { PaymentReconciliationWorker } from './workers/payment-reconciliation.worker';

@Module({
  imports: [TicketModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentRepository,
    PaymentIntentService,
    MockPaymentProvider,
    PaymentBulkheadService,
    PaymentCircuitBreakerService,
    ResilientPaymentProvider,
    PaymentReconciliationService,
    PaymentReconciliationWorker,
    { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProvider },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
