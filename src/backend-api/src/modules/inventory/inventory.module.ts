import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';
import { ReservationExpiryWorker } from '../../workers/reservation-expiry.worker';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository, ReservationExpiryWorker],
  exports: [InventoryService],
})
export class InventoryModule {}
