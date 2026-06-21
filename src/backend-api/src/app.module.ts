import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

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

@Module({
  imports: [
    // Cấu hình hệ thống
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AppConfigModule,
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
