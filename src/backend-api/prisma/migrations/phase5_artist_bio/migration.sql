CREATE TYPE "ArtistBioJobStatus" AS ENUM ('queued', 'processing', 'draft_ready', 'failed');

CREATE TYPE "ArtistBioReviewStatus" AS ENUM ('pending_review', 'approved', 'rejected');

CREATE TABLE "artist_bio_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "concert_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "pipeline_version" TEXT NOT NULL,
    "status" "ArtistBioJobStatus" NOT NULL DEFAULT 'queued',
    "extracted_text" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 2,
    "error_code" TEXT,
    "error_message" TEXT,
    "dlq_reason" TEXT,
    "dlq_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artist_bio_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "artist_bio_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "generated_content" TEXT NOT NULL,
    "edited_content" TEXT,
    "review_status" "ArtistBioReviewStatus" NOT NULL DEFAULT 'pending_review',
    "prompt_version" TEXT NOT NULL,
    "model_provider_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "artist_bio_drafts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "artist_bio_jobs_concert_id_checksum_pipeline_version_key"
    ON "artist_bio_jobs"("concert_id", "checksum", "pipeline_version");

CREATE INDEX "artist_bio_jobs_concert_id_created_at_idx"
    ON "artist_bio_jobs"("concert_id", "created_at");

CREATE INDEX "artist_bio_jobs_status_updated_at_idx"
    ON "artist_bio_jobs"("status", "updated_at");

CREATE UNIQUE INDEX "artist_bio_drafts_job_id_key"
    ON "artist_bio_drafts"("job_id");

ALTER TABLE "artist_bio_jobs"
    ADD CONSTRAINT "artist_bio_jobs_concert_id_fkey"
    FOREIGN KEY ("concert_id") REFERENCES "concerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "artist_bio_drafts"
    ADD CONSTRAINT "artist_bio_drafts_job_id_fkey"
    FOREIGN KEY ("job_id") REFERENCES "artist_bio_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
