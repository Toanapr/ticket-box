import { Controller, Get, Param } from '@nestjs/common';
import { ConcertsService } from './concerts.service';

@Controller('concerts')
export class ConcertsController {
  constructor(private readonly concertsService: ConcertsService) {}

  @Get()
  list() {
    return this.concertsService.listPublishedUpcoming();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.concertsService.getPublishedDetail(id);
  }
}
