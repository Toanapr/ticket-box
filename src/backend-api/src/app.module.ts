import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { resolve } from 'node:path';

import { CacheModule } from './common/cache/cache.module';
import { AppConfigModule } from './config/config.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConcertsModule } from './modules/concert/concerts.module';

import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TicketModule } from './modules/ticket/ticket.module';

import { PrismaModule } from './prisma/prisma.module';

const backendEnvFilePath = resolve(__dirname, '..', '.env');

@Module({
  imports: [
    // Cấu hình hệ thống
    ConfigModule.forRoot({
      envFilePath: backendEnvFilePath,
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AppConfigModule,
    CacheModule,
    PrismaModule,

    // Feature Modules
    AuthModule,
    ConcertsModule,
    AdminModule,
    HealthModule,
    InventoryModule,
    OrderModule,
    PaymentModule,
    TicketModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
