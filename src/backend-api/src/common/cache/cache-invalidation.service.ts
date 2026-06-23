import { Injectable } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheInvalidationService {
  constructor(private readonly cacheService: CacheService) {}

  async invalidateConcertList(): Promise<void> {
    await this.cacheService.deleteByPattern('concert:list:*');
  }

  async invalidateConcert(concertId: string): Promise<void> {
    await Promise.all([
      this.invalidateConcertList(),
      this.cacheService.deleteKeys(`concert:detail:${concertId}`),
    ]);
  }

  async invalidateTicketType(
    ticketTypeId: string,
    concertId?: string,
  ): Promise<void> {
    await Promise.all([
      this.cacheService.deleteKeys(`inventory:summary:${ticketTypeId}`),
      concertId
        ? this.invalidateConcert(concertId)
        : this.invalidateConcertList(),
    ]);
  }
}
