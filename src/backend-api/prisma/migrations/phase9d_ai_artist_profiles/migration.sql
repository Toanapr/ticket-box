ALTER TABLE "concerts"
    ADD COLUMN "published_artist_profiles" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "artist_bio_drafts"
    ADD COLUMN "artist_profiles" JSONB NOT NULL DEFAULT '[]';
