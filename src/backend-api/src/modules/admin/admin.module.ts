import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConcertPosterModule } from '../concert-poster/concert-poster.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, ConcertPosterModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
