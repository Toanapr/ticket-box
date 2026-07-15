CREATE TYPE "GuestListBatchStatus" AS ENUM ('imported', 'validation_failed', 'published', 'failed');

CREATE TYPE "GuestEntryStagingStatus" AS ENUM ('valid', 'invalid');

CREATE TYPE "GuestListOutboxStatus" AS ENUM ('pending', 'published', 'failed');

CREATE TABLE "guest_list_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "file_checksum" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "raw_object_key" TEXT NOT NULL,
    "original_name" TEXT,
    "status" "GuestListBatchStatus" NOT NULL,
    "summary" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_entries_staging" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "full_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "sponsor_id" TEXT,
    "identity_key" TEXT,
    "zone_code" TEXT,
    "ticket_type_slug" TEXT,
    "ticket_type_id" UUID,
    "status" "GuestEntryStagingStatus" NOT NULL,
    "error_reason" TEXT,
    "raw_row" JSONB NOT NULL,

    CONSTRAINT "guest_entries_staging_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_list_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "checksum" TEXT NOT NULL,
    "entry_count" INTEGER NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_list_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "sponsor_id" TEXT,
    "identity_key" TEXT NOT NULL,
    "zone_code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_list_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "GuestListOutboxStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "guest_list_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guest_list_batches_concert_id_file_checksum_schema_version_key" ON "guest_list_batches"("concert_id", "file_checksum", "schema_version");
CREATE INDEX "guest_list_batches_concert_id_created_at_idx" ON "guest_list_batches"("concert_id", "created_at");

CREATE UNIQUE INDEX "guest_entries_staging_batch_id_row_number_key" ON "guest_entries_staging"("batch_id", "row_number");
CREATE INDEX "guest_entries_staging_batch_id_status_idx" ON "guest_entries_staging"("batch_id", "status");
CREATE INDEX "guest_entries_staging_batch_id_identity_key_idx" ON "guest_entries_staging"("batch_id", "identity_key");

CREATE UNIQUE INDEX "guest_list_versions_batch_id_key" ON "guest_list_versions"("batch_id");
CREATE UNIQUE INDEX "guest_list_versions_concert_id_version_no_key" ON "guest_list_versions"("concert_id", "version_no");
CREATE INDEX "guest_list_versions_concert_id_is_active_idx" ON "guest_list_versions"("concert_id", "is_active");
CREATE UNIQUE INDEX "guest_list_versions_one_active_per_concert_idx" ON "guest_list_versions"("concert_id") WHERE "is_active" = true;

CREATE UNIQUE INDEX "guest_entries_version_id_identity_key_key" ON "guest_entries"("version_id", "identity_key");
CREATE INDEX "guest_entries_version_id_zone_code_idx" ON "guest_entries"("version_id", "zone_code");
CREATE INDEX "guest_entries_ticket_type_id_idx" ON "guest_entries"("ticket_type_id");

CREATE INDEX "guest_list_outbox_status_created_at_idx" ON "guest_list_outbox"("status", "created_at");

ALTER TABLE "guest_list_batches"
    ADD CONSTRAINT "guest_list_batches_concert_id_fkey"
    FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_entries_staging"
    ADD CONSTRAINT "guest_entries_staging_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "guest_list_batches"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_list_versions"
    ADD CONSTRAINT "guest_list_versions_concert_id_fkey"
    FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_list_versions"
    ADD CONSTRAINT "guest_list_versions_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "guest_list_batches"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guest_entries"
    ADD CONSTRAINT "guest_entries_version_id_fkey"
    FOREIGN KEY ("version_id") REFERENCES "guest_list_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_entries"
    ADD CONSTRAINT "guest_entries_ticket_type_id_fkey"
    FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
