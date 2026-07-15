ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'pending';

ALTER TYPE "NotificationChannel" RENAME VALUE 'email_mock' TO 'email';

ALTER TABLE "notification_records"
  ADD COLUMN "notification_type" TEXT,
  ADD COLUMN "concert_id" UUID,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "scheduled_for" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "processed_at" TIMESTAMPTZ(6);

UPDATE "notification_records"
SET
  "notification_type" = "event_type",
  "idempotency_key" = CONCAT('legacy:', "id"::TEXT),
  "scheduled_for" = "created_at",
  "processed_at" = CASE
    WHEN "status" IN ('sent'::"NotificationStatus", 'failed'::"NotificationStatus") THEN "created_at"
    ELSE NULL
  END
WHERE "notification_type" IS NULL
   OR "idempotency_key" IS NULL;

ALTER TABLE "notification_records"
  ALTER COLUMN "notification_type" SET NOT NULL,
  ALTER COLUMN "idempotency_key" SET NOT NULL,
  ALTER COLUMN "order_id" DROP NOT NULL,
  ALTER COLUMN "ticket_count" DROP NOT NULL;

CREATE UNIQUE INDEX "notification_records_idempotency_key_key"
  ON "notification_records"("idempotency_key");

CREATE INDEX "notification_records_status_scheduled_for_idx"
  ON "notification_records"("status", "scheduled_for");

CREATE INDEX "notification_records_concert_id_idx"
  ON "notification_records"("concert_id");

ALTER TABLE "notification_records"
  ADD CONSTRAINT "notification_records_concert_id_fkey"
  FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
