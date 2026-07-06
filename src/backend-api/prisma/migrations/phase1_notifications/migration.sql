CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed');

CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'email_mock');

CREATE TABLE "notification_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "ticket_count" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notification_records_organization_id_created_at_idx" ON "notification_records"("organization_id", "created_at");

CREATE INDEX "notification_records_order_id_idx" ON "notification_records"("order_id");

ALTER TABLE "notification_records"
    ADD CONSTRAINT "notification_records_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;