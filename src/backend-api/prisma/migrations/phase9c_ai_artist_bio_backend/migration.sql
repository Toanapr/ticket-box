CREATE TYPE "ArtistBioJobStatus" AS ENUM ('queued', 'processing', 'draft_ready', 'failed');

CREATE TYPE "ArtistBioDraftReviewStatus" AS ENUM ('pending_review');

CREATE TABLE "artist_bio_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "file_checksum" TEXT NOT NULL,
    "pipeline_version" TEXT NOT NULL,
    "raw_object_key" TEXT NOT NULL,
    "original_name" TEXT,
    "source_mime_type" TEXT,
    "status" "ArtistBioJobStatus" NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_owner" TEXT,
    "lease_expires_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "last_error_at" TIMESTAMPTZ(6),
    "extracted_text" TEXT,
    "sanitized_text" TEXT,
    "provider_version" TEXT,
    "model_version" TEXT,
    "prompt_version" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_bio_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "artist_bio_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "review_status" "ArtistBioDraftReviewStatus" NOT NULL DEFAULT 'pending_review',
    "provider_version" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_bio_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "artist_bio_jobs_concert_id_file_checksum_pipeline_version_key"
    ON "artist_bio_jobs"("concert_id", "file_checksum", "pipeline_version");
CREATE INDEX "artist_bio_jobs_concert_id_created_at_idx"
    ON "artist_bio_jobs"("concert_id", "created_at");
CREATE INDEX "artist_bio_jobs_status_next_attempt_at_idx"
    ON "artist_bio_jobs"("status", "next_attempt_at");
CREATE INDEX "artist_bio_jobs_lease_expires_at_idx"
    ON "artist_bio_jobs"("lease_expires_at");

CREATE UNIQUE INDEX "artist_bio_drafts_job_id_key"
    ON "artist_bio_drafts"("job_id");
CREATE INDEX "artist_bio_drafts_concert_id_created_at_idx"
    ON "artist_bio_drafts"("concert_id", "created_at");

ALTER TABLE "artist_bio_jobs"
    ADD CONSTRAINT "artist_bio_jobs_concert_id_fkey"
    FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artist_bio_drafts"
    ADD CONSTRAINT "artist_bio_drafts_concert_id_fkey"
    FOREIGN KEY ("concert_id") REFERENCES "concerts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artist_bio_drafts"
    ADD CONSTRAINT "artist_bio_drafts_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "artist_bio_jobs"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
