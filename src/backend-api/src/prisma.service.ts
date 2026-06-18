import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private schemaReady?: Promise<void>;

  async onModuleInit() {
    await this.$connect();
    await this.ensureSqliteSchema();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async ensureSqliteSchema() {
    this.schemaReady ??= this.createSqliteSchema();

    return this.schemaReady;
  }

  private async createSqliteSchema() {
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Concert" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "venue" TEXT NOT NULL,
        "startsAt" DATETIME NOT NULL,
        "status" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TicketType" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "concertId" TEXT NOT NULL,
        "zoneCode" TEXT NOT NULL,
        "price" INTEGER NOT NULL,
        "capacity" INTEGER NOT NULL,
        "saleStartsAt" DATETIME NOT NULL,
        "saleEndsAt" DATETIME NOT NULL,
        "perUserLimit" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TicketType_concertId_fkey" FOREIGN KEY ("concertId") REFERENCES "Concert" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NotificationRecord" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "eventType" TEXT NOT NULL,
        "ticketId" TEXT NOT NULL,
        "orderId" TEXT NOT NULL,
        "concertId" TEXT NOT NULL,
        "channel" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "error" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "Concert_organizationId_idx" ON "Concert"("organizationId")',
    );
    await this.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Concert_status_idx" ON "Concert"("status")');
    await this.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "TicketType_concertId_idx" ON "TicketType"("concertId")',
    );
    await this.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "NotificationRecord_eventType_idx" ON "NotificationRecord"("eventType")',
    );
    await this.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "NotificationRecord_ticketId_idx" ON "NotificationRecord"("ticketId")',
    );
    await this.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "NotificationRecord_concertId_idx" ON "NotificationRecord"("concertId")',
    );
  }
}
