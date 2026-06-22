import { Controller, Get, Param } from '@nestjs/common';
import { RateLimit } from '../../common/cache/rate-limit.decorator';
import { ConcertsService } from './concerts.service';

@Controller('concerts')
export class ConcertsController {
  constructor(private readonly concertsService: ConcertsService) {}

  @Get()
  @RateLimit([
    { scope: 'ip', limit: 120, windowSeconds: 60 },
    { scope: 'device', limit: 240, windowSeconds: 60 },
  ])
  list() {
    return this.concertsService.listPublishedUpcoming();
  }

  @Get(':id')
  @RateLimit([
    { scope: 'ip', limit: 180, windowSeconds: 60 },
    { scope: 'device', limit: 300, windowSeconds: 60 },
  ])
  detail(@Param('id') id: string) {
    return this.concertsService.getPublishedDetail(id);
  }
}
