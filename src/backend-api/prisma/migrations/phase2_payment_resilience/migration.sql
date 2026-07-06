ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'pending_reconciliation';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'expired';

CREATE TYPE "IdempotencyStatus" AS ENUM ('processing', 'succeeded', 'failed_final');
CREATE TYPE "PaymentProviderEventStatus" AS ENUM ('processing', 'processed', 'rejected');

ALTER TABLE "Payment"
  ADD COLUMN "providerIntentId" TEXT,
  ADD COLUMN "providerIdempotencyKey" TEXT,
  ADD COLUMN "checkoutUrl" TEXT,
  ADD COLUMN "uncertainSince" TIMESTAMPTZ(6),
  ADD COLUMN "reconciliationAfter" TIMESTAMPTZ(6),
  ADD COLUMN "reconciliationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMPTZ(6),
  ADD COLUMN "lastProviderError" TEXT,
  ADD COLUMN "lastProviderAttemptAt" TIMESTAMPTZ(6);

UPDATE "Payment"
SET "providerIdempotencyKey" = 'payment:' || "orderId"::text || ':' || "provider"
WHERE "providerIdempotencyKey" IS NULL;

ALTER TABLE "Payment" ALTER COLUMN "providerIdempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "Payment_providerIdempotencyKey_key" ON "Payment"("providerIdempotencyKey");
CREATE UNIQUE INDEX "Payment_orderId_provider_key" ON "Payment"("orderId", "provider");
CREATE UNIQUE INDEX "Payment_provider_providerTxnId_key" ON "Payment"("provider", "providerTxnId");
CREATE INDEX "Payment_status_reconciliationAfter_idx" ON "Payment"("status", "reconciliationAfter");

CREATE TABLE "IdempotencyRecord" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" "IdempotencyStatus" NOT NULL,
  "resourceId" UUID,
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "processingOwner" TEXT,
  "processingUntil" TIMESTAMPTZ(6),
  "providerDispatched" BOOLEAN NOT NULL DEFAULT false,
  "retainUntil" TIMESTAMPTZ(6) NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdempotencyRecord_userId_endpoint_key_key" ON "IdempotencyRecord"("userId", "endpoint", "key");
CREATE INDEX "IdempotencyRecord_status_processingUntil_idx" ON "IdempotencyRecord"("status", "processingUntil");

CREATE TABLE "PaymentProviderEvent" (
  "id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "providerTxnId" TEXT NOT NULL,
  "orderId" UUID NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "status" "PaymentProviderEventStatus" NOT NULL,
  "responseBody" JSONB,
  "errorCode" TEXT,
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMPTZ(6),
  CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentProviderEvent_provider_providerEventId_key" ON "PaymentProviderEvent"("provider", "providerEventId");
CREATE INDEX "PaymentProviderEvent_orderId_receivedAt_idx" ON "PaymentProviderEvent"("orderId", "receivedAt");
